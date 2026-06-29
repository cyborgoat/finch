from datetime import datetime

from app.schemas import CamelModel


class JobResponse(CamelModel):
    id: str
    type: str
    status: str
    progress: float
    stage: str | None = None
    result_id: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
