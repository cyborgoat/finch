from fastapi import APIRouter, Depends

from app.api.deps import get_user_settings_service
from app.domains.settings.user_settings_service import UserSettingsService
from app.schemas.user_settings import UpdateUserSettingsRequest, UserSettingsResponse

router = APIRouter(prefix="/user-settings", tags=["user-settings"])


@router.get("", response_model=UserSettingsResponse)
def get_user_settings(
    service: UserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    return service.get_settings()


@router.patch("", response_model=UserSettingsResponse)
def update_user_settings(
    payload: UpdateUserSettingsRequest,
    service: UserSettingsService = Depends(get_user_settings_service),
) -> UserSettingsResponse:
    return service.update_settings(payload)
