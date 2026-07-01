from datetime import datetime

from app.schemas import CamelModel
from app.schemas.recording import SpeakerSegmentSchema


class SpeakerMappingItem(CamelModel):
    cluster_id: str
    display_name: str
    profile_id: str | None = None
    enroll: bool = False
    enroll_start_sec: float | None = None
    enroll_end_sec: float | None = None


class UpdateRecordingSpeakersRequest(CamelModel):
    mappings: list[SpeakerMappingItem]


class UpdateRecordingSpeakersResponse(CamelModel):
    id: str
    speaker_segments: list[SpeakerSegmentSchema]
    raw_text: str
    updated_at: datetime
