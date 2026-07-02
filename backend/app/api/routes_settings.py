from fastapi import APIRouter, Depends

from app.api.deps import (
    get_llm_settings_service,
    get_transcription_settings_service,
    get_user_settings_service,
)
from app.domains.settings.llm_settings_service import LlmSettingsService
from app.domains.settings.transcription_settings_service import TranscriptionSettingsService
from app.domains.settings.user_settings_service import UserSettingsService
from app.schemas.llm_settings import LlmSettingsResponse, UpdateLlmSettingsRequest
from app.schemas.transcription_settings import (
    TranscriptionSettingsResponse,
    UpdateTranscriptionSettingsRequest,
)
from app.schemas.user_settings import UpdateUserSettingsRequest, UserSettingsResponse

user_settings_router = APIRouter(prefix="/user-settings", tags=["user-settings"])
llm_settings_router = APIRouter(prefix="/llm-settings", tags=["llm-settings"])
transcription_settings_router = APIRouter(
    prefix="/transcription-settings",
    tags=["transcription-settings"],
)


@user_settings_router.get("", response_model=UserSettingsResponse)
def get_user_settings(
    service: UserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    return service.get_settings()


@user_settings_router.patch("", response_model=UserSettingsResponse)
def update_user_settings(
    payload: UpdateUserSettingsRequest,
    service: UserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    return service.update_settings(payload)


@llm_settings_router.get("", response_model=LlmSettingsResponse)
def get_llm_settings(
    service: LlmSettingsService = Depends(get_llm_settings_service),
) -> LlmSettingsResponse:
    return service.get_settings()


@llm_settings_router.patch("", response_model=LlmSettingsResponse)
def update_llm_settings(
    payload: UpdateLlmSettingsRequest,
    service: LlmSettingsService = Depends(get_llm_settings_service),
) -> LlmSettingsResponse:
    return service.update_settings(payload)


@transcription_settings_router.get("", response_model=TranscriptionSettingsResponse)
def get_transcription_settings(
    service: TranscriptionSettingsService = Depends(get_transcription_settings_service),
) -> TranscriptionSettingsResponse:
    return service.get_settings()


@transcription_settings_router.patch("", response_model=TranscriptionSettingsResponse)
def update_transcription_settings(
    payload: UpdateTranscriptionSettingsRequest,
    service: TranscriptionSettingsService = Depends(get_transcription_settings_service),
) -> TranscriptionSettingsResponse:
    return service.update_settings(payload)
