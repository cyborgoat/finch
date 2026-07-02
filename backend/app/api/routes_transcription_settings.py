from fastapi import APIRouter, Depends

from app.api.deps import get_transcription_settings_service
from app.domains.settings.transcription_settings_service import TranscriptionSettingsService
from app.schemas.transcription_settings import (
    TranscriptionSettingsResponse,
    UpdateTranscriptionSettingsRequest,
)

router = APIRouter(prefix="/transcription-settings", tags=["transcription-settings"])


@router.get("", response_model=TranscriptionSettingsResponse)
def get_transcription_settings(
    service: TranscriptionSettingsService = Depends(get_transcription_settings_service),
) -> TranscriptionSettingsResponse:
    return service.get_settings()


@router.patch("", response_model=TranscriptionSettingsResponse)
def update_transcription_settings(
    payload: UpdateTranscriptionSettingsRequest,
    service: TranscriptionSettingsService = Depends(get_transcription_settings_service),
) -> TranscriptionSettingsResponse:
    return service.update_settings(payload)
