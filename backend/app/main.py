from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.capabilities.startup import log_startup_summary
from app.config import get_settings
from app.core.errors import AppError, app_error_handler
from app.core.logging import setup_logging
from app.domains.jobs.queue import recover_orphaned_jobs
from app.storage.database import create_db_and_tables
from app.storage.file_store import ensure_data_dirs


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    setup_logging(debug=settings.debug_mode)
    ensure_data_dirs(settings)
    create_db_and_tables()
    recover_orphaned_jobs()
    log_startup_summary(settings)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_exception_handler(AppError, app_error_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api")

    return app


app = create_app()
