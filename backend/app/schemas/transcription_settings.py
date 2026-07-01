from typing import Literal

from app.schemas import CamelModel

TranscriptionSettingsSource = Literal["stored", "unset"]


class TranscriptionSettingsResponse(CamelModel):
    diarization_enabled: bool
    diarization_ready: bool
    diarization_reason: str | None = None
    voiceprint_profiles_enabled: bool
    voiceprint_profiles_ready: bool
    voiceprint_profiles_reason: str | None = None
    voiceprint_auto_label_enabled: bool
    source: TranscriptionSettingsSource


class UpdateTranscriptionSettingsRequest(CamelModel):
    diarization_enabled: bool | None = None
    voiceprint_profiles_enabled: bool | None = None
    voiceprint_auto_label_enabled: bool | None = None
