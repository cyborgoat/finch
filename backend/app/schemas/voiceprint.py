from datetime import datetime

from app.schemas import CamelModel


class CreateVoiceprintProfileRequest(CamelModel):
    display_name: str
    notes: str | None = None


class EnrollVoiceprintProfileFromAudioRequest(CamelModel):
    audio_asset_id: str
    display_name: str
    profile_id: str | None = None
    set_as_user_profile: bool = False


class UpdateVoiceprintProfileRequest(CamelModel):
    display_name: str | None = None
    notes: str | None = None


class VoiceprintProfileSummary(CamelModel):
    id: str
    display_name: str
    notes: str | None = None
    embedding_count: int = 0
    related_recording_count: int = 0
    created_at: datetime
    updated_at: datetime


class VoiceprintEmbeddingSummary(CamelModel):
    id: str
    model_id: str
    source_recording_id: str | None = None
    source_cluster_id: str | None = None
    duration_sec: float | None = None
    dimensions: int
    created_at: datetime


class RelatedRecordingSummary(CamelModel):
    id: str
    title: str
    segment_count: int
    updated_at: datetime


class VoiceprintProfileDetailResponse(CamelModel):
    id: str
    display_name: str
    notes: str | None = None
    embedding_count: int = 0
    embedding_description: str
    embeddings: list[VoiceprintEmbeddingSummary]
    related_recordings: list[RelatedRecordingSummary]
    created_at: datetime
    updated_at: datetime


class VoiceprintProfileListResponse(CamelModel):
    items: list[VoiceprintProfileSummary]


class VoiceprintProfileResponse(CamelModel):
    id: str
    display_name: str
    notes: str | None = None
    embedding_count: int = 0
    created_at: datetime
    updated_at: datetime


class EnrollVoiceprintProfileFromAudioResponse(CamelModel):
    profile: VoiceprintProfileResponse
    user_voiceprint_profile_id: str | None = None


class VoiceprintProfilesStatusResponse(CamelModel):
    enabled: bool
    consent_given: bool
    consent_at: datetime | None = None
    profile_count: int
    ready: bool
    reason: str | None = None


class VoiceprintProfilesConsentResponse(CamelModel):
    consent_at: datetime


class VoiceprintProfilesToggleRequest(CamelModel):
    enabled: bool
