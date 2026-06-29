from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.audio_asset import utc_now


class Job(SQLModel, table=True):
    id: str = Field(primary_key=True)
    type: str
    status: str
    progress: float = 0.0
    stage: str | None = None
    result_id: str | None = None
    error: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
