from datetime import datetime

from app.schemas import CamelModel
from app.schemas.transcript import SpeakerSegmentSchema


class SpeakerMappingItem(CamelModel):
    cluster_id: str
    display_name: str
    profile_id: str | None = None
    enroll: bool = False


class UpdateTranscriptSpeakersRequest(CamelModel):
    mappings: list[SpeakerMappingItem]


class UpdateTranscriptSpeakersResponse(CamelModel):
    id: str
    speaker_segments: list[SpeakerSegmentSchema]
    raw_text: str
    updated_at: datetime


class CreateSpeakerProfileRequest(CamelModel):
    display_name: str
    notes: str | None = None


class UpdateSpeakerProfileRequest(CamelModel):
    display_name: str | None = None
    notes: str | None = None


class SpeakerProfileSummary(CamelModel):
    id: str
    display_name: str
    notes: str | None = None
    embedding_count: int = 0
    related_transcript_count: int = 0
    created_at: datetime
    updated_at: datetime


class SpeakerEmbeddingSummary(CamelModel):
    id: str
    model_id: str
    source_transcript_id: str | None = None
    source_cluster_id: str | None = None
    duration_sec: float | None = None
    dimensions: int
    created_at: datetime


class RelatedTranscriptSummary(CamelModel):
    id: str
    title: str
    segment_count: int
    updated_at: datetime


class SpeakerProfileDetailResponse(CamelModel):
    id: str
    display_name: str
    notes: str | None = None
    embedding_count: int = 0
    embedding_description: str
    embeddings: list[SpeakerEmbeddingSummary]
    related_transcripts: list[RelatedTranscriptSummary]
    created_at: datetime
    updated_at: datetime


class SpeakerProfileListResponse(CamelModel):
    items: list[SpeakerProfileSummary]


class SpeakerProfileResponse(CamelModel):
    id: str
    display_name: str
    notes: str | None = None
    embedding_count: int = 0
    created_at: datetime
    updated_at: datetime


class SpeakerMemoryStatusResponse(CamelModel):
    enabled: bool
    consent_given: bool
    consent_at: datetime | None = None
    profile_count: int
    ready: bool
    reason: str | None = None


class SpeakerMemoryConsentResponse(CamelModel):
    consent_at: datetime


class SpeakerMemoryToggleRequest(CamelModel):
    enabled: bool
