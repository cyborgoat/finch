from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.audio_asset import utc_now


class AppPreference(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str
    updated_at: datetime = Field(default_factory=utc_now)
