from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.schemas.user_settings import UpdateUserSettingsRequest, UserSettingsResponse
from app.services.user_settings_service import UserSettingsService
from app.storage.database import get_session

router = APIRouter(tags=["user-settings"])


@router.get("/user-settings", response_model=UserSettingsResponse)
def get_user_settings(session: Session = Depends(get_session)) -> UserSettingsResponse:
    return UserSettingsService(session).get_settings()


@router.patch("/user-settings", response_model=UserSettingsResponse)
def update_user_settings(
    payload: UpdateUserSettingsRequest,
    session: Session = Depends(get_session),
) -> UserSettingsResponse:
    return UserSettingsService(session).update_settings(payload)
