from fastapi import APIRouter, Depends

from app.api.deps import get_llm_settings_service
from app.domains.settings.llm_settings_service import LlmSettingsService
from app.schemas.llm_settings import LlmSettingsResponse, UpdateLlmSettingsRequest

router = APIRouter(prefix="/llm-settings", tags=["llm-settings"])


@router.get("", response_model=LlmSettingsResponse)
def get_llm_settings(
    service: LlmSettingsService = Depends(get_llm_settings_service),
) -> LlmSettingsResponse:
    return service.get_settings()


@router.patch("", response_model=LlmSettingsResponse)
def update_llm_settings(
    payload: UpdateLlmSettingsRequest,
    service: LlmSettingsService = Depends(get_llm_settings_service),
) -> LlmSettingsResponse:
    return service.update_settings(payload)
