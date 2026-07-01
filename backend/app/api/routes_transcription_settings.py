from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.schemas.transcription_settings import (
    TranscriptionSettingsResponse,
    UpdateTranscriptionSettingsRequest,
)
from app.services.transcription_settings_service import TranscriptionSettingsService
from app.storage.database import get_session

router = APIRouter(tags=["transcription-settings"])


@router.get("/transcription-settings", response_model=TranscriptionSettingsResponse)
def get_transcription_settings(
    session: Session = Depends(get_session),
) -> TranscriptionSettingsResponse:
    return TranscriptionSettingsService(session).get_settings()


@router.patch("/transcription-settings", response_model=TranscriptionSettingsResponse)
def update_transcription_settings(
    payload: UpdateTranscriptionSettingsRequest,
    session: Session = Depends(get_session),
) -> TranscriptionSettingsResponse:
    return TranscriptionSettingsService(session).update_settings(payload)
