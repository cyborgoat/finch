from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.audio_asset import utc_now


class SpeakerProfile(SQLModel, table=True):
    id: str = Field(primary_key=True)
    display_name: str
    notes: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class SpeakerEmbedding(SQLModel, table=True):
    id: str = Field(primary_key=True)
    profile_id: str = Field(foreign_key="speakerprofile.id")
    embedding: str
    model_id: str
    source_recording_id: str | None = None
    source_cluster_id: str | None = None
    duration_sec: float | None = None
    created_at: datetime = Field(default_factory=utc_now)
