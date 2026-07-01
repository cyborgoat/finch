from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.schemas.llm_settings import LlmSettingsResponse, UpdateLlmSettingsRequest
from app.services.llm_settings_service import LlmSettingsService
from app.storage.database import get_session

router = APIRouter(tags=["llm-settings"])


@router.get("/llm-settings", response_model=LlmSettingsResponse)
def get_llm_settings(session: Session = Depends(get_session)) -> LlmSettingsResponse:
    return LlmSettingsService(session).get_settings()


@router.patch("/llm-settings", response_model=LlmSettingsResponse)
def update_llm_settings(
    payload: UpdateLlmSettingsRequest,
    session: Session = Depends(get_session),
) -> LlmSettingsResponse:
    return LlmSettingsService(session).update_settings(payload)
