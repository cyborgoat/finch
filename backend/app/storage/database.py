from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings
from app.models.audio_asset import AudioAsset  # noqa: F401
from app.models.job import Job  # noqa: F401
from app.models.transcript import Transcript  # noqa: F401

_engine = None


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
    SQLModel.metadata.create_all(get_engine())


def get_session() -> Generator[Session]:
    with Session(get_engine()) as session:
        yield session
