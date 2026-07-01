from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.audio_asset import utc_now


class Document(SQLModel, table=True):
    id: str = Field(primary_key=True)
    transcript_id: str = Field(foreign_key="transcript.id")
    title: str
    type: str
    markdown: str
    model: str
    prompt_version: str = "v1"
    status: str = "ready"
    generation_job_id: str | None = Field(default=None, foreign_key="job.id")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
