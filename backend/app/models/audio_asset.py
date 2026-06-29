from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class AudioAsset(SQLModel, table=True):
    id: str = Field(primary_key=True)
    source: str
    filename: str
    mime_type: str
    size_bytes: int
    duration_seconds: float | None = None
    original_path: str
    normalized_path: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
