from collections.abc import Generator
from pathlib import Path

from alembic.config import Config
from sqlmodel import Session, create_engine

import app.models  # noqa: F401 — register SQLModel tables
from alembic import command
from app.config import get_settings

_engine = None
_BACKEND_DIR = Path(__file__).resolve().parents[2]


def _alembic_config() -> Config:
    config = Config(str(_BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    return config


def _run_alembic_upgrade() -> None:
    command.upgrade(_alembic_config(), "head")


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        connect_args = (
            {"check_same_thread": False, "timeout": 30}
            if settings.database_url.startswith("sqlite")
            else {}
        )
        _engine = create_engine(settings.database_url, connect_args=connect_args)
        if settings.database_url.startswith("sqlite"):
            with _engine.connect() as connection:
                connection.exec_driver_sql("PRAGMA journal_mode=WAL")
                connection.commit()
    return _engine


def reset_engine(database_url: str | None = None) -> None:
    global _engine
    if database_url is None:
        _engine = None
        return
    connect_args = {"check_same_thread": False, "timeout": 30} if database_url.startswith("sqlite") else {}
    _engine = create_engine(database_url, connect_args=connect_args)
    if database_url.startswith("sqlite"):
        with _engine.connect() as connection:
            connection.exec_driver_sql("PRAGMA journal_mode=WAL")
            connection.commit()


def create_db_and_tables() -> None:
    _run_alembic_upgrade()


def get_session() -> Generator[Session]:
    with Session(get_engine()) as session:
        yield session
