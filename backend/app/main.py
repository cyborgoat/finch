from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    routes_ai_actions,
    routes_audio,
    routes_documents,
    routes_health,
    routes_jobs,
    routes_llm_settings,
    routes_speaker_profiles,
    routes_transcripts,
    routes_user_settings,
)
from app.config import get_settings
from app.core.errors import AppError, app_error_handler
from app.core.logging import setup_logging
from app.core.startup_diagnostics import log_startup_summary
from app.storage.database import create_db_and_tables
from app.storage.file_store import ensure_data_dirs


@asynccontextmanager
async def lifespan(_app: FastAPI):
    setup_logging()
    settings = get_settings()
    ensure_data_dirs(settings)
    create_db_and_tables()
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

    app.include_router(routes_health.router, prefix="/api")
    app.include_router(routes_audio.router, prefix="/api")
    app.include_router(routes_transcripts.router, prefix="/api")
    app.include_router(routes_jobs.router, prefix="/api")
    app.include_router(routes_ai_actions.router, prefix="/api")
    app.include_router(routes_documents.router, prefix="/api")
    app.include_router(routes_speaker_profiles.router, prefix="/api")
    app.include_router(routes_user_settings.router, prefix="/api")
    app.include_router(routes_llm_settings.router, prefix="/api")

    return app


app = create_app()
