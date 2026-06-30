from collections.abc import Generator

from sqlalchemy import inspect
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings
import app.models  # noqa: F401 — register SQLModel tables

_engine = None

_SQLITE_COLUMN_PATCHES: dict[str, dict[str, str]] = {
    "transcript": {
        "speaker_segments": "TEXT",
        "error_message": "TEXT",
        "processing_note": "TEXT",
    },
}


def _apply_sqlite_column_patches(engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    with engine.begin() as connection:
        for table_name, columns in _SQLITE_COLUMN_PATCHES.items():
            if not inspector.has_table(table_name):
                continue
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_type in columns.items():
                if column_name in existing:
                    continue
                connection.exec_driver_sql(
                    f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
                )


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        connect_args = (
            {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
        )
        _engine = create_engine(settings.database_url, connect_args=connect_args)
    return _engine


def reset_engine(database_url: str | None = None) -> None:
    global _engine
    if database_url is None:
        _engine = None
        return
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    _engine = create_engine(database_url, connect_args=connect_args)
    SQLModel.metadata.create_all(_engine)


def create_db_and_tables() -> None:
    engine = get_engine()
    SQLModel.metadata.create_all(engine)
    _apply_sqlite_column_patches(engine)


def get_session() -> Generator[Session]:
    with Session(get_engine()) as session:
        yield session
