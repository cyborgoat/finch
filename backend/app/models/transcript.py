from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.audio_asset import utc_now


class Transcript(SQLModel, table=True):
    id: str = Field(primary_key=True)
    audio_asset_id: str = Field(foreign_key="audioasset.id")
    title: str
    raw_text: str
    edited_text: str | None = None
    language: str | None = None
    status: str = "draft"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
