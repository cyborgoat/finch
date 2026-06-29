from datetime import datetime

from app.schemas import CamelModel


class AudioAssetResponse(CamelModel):
    id: str
    source: str
    filename: str
    mime_type: str
    size_bytes: int
    duration_seconds: float | None = None
    created_at: datetime


class OkResponse(CamelModel):
    ok: bool = True
