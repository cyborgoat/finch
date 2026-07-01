from typing import Literal

from app.schemas import CamelModel

TranscriptionSettingsSource = Literal["stored", "unset"]


class TranscriptionSettingsResponse(CamelModel):
    diarization_enabled: bool
    diarization_ready: bool
    diarization_reason: str | None = None
    speaker_memory_enabled: bool
    speaker_memory_ready: bool
    speaker_memory_reason: str | None = None
    speaker_auto_label_enabled: bool
    hf_token_configured: bool
    source: TranscriptionSettingsSource


class UpdateTranscriptionSettingsRequest(CamelModel):
    diarization_enabled: bool | None = None
    speaker_memory_enabled: bool | None = None
    speaker_auto_label_enabled: bool | None = None
    hf_token: str | None = None
