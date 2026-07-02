from typing import Any

from sqlmodel import Session

from app.core.errors import AppError
from app.domains.settings.settings_utils import JsonSettingsRepository
from app.domains.voiceprint.profile_service import VoiceprintProfileService
from app.schemas.user_settings import UpdateUserSettingsRequest, UserSettingsResponse

USER_SETTINGS_KEY = "user_settings"

DEFAULT_USER_SETTINGS: dict[str, Any] = {
    "ui_language": "en",
    "content_language": "en",
    "summary_style": "balanced",
    "summary_format": "paragraphs",
    "user_name": "",
    "user_voiceprint_profile_id": None,
    "notes_auto_save": True,
}


def _merge_user_settings(parsed: dict[str, Any]) -> dict[str, Any]:
    merged = dict(DEFAULT_USER_SETTINGS)
    for key in DEFAULT_USER_SETTINGS:
        if key in parsed:
            merged[key] = parsed[key]
    return merged


class UserSettingsService:
    def __init__(self, session: Session) -> None:
        self.repository = JsonSettingsRepository(
            session,
            USER_SETTINGS_KEY,
            default=DEFAULT_USER_SETTINGS,
            merge_default=_merge_user_settings,
        )

    def get_settings(self) -> UserSettingsResponse:
        return UserSettingsResponse.model_validate(self.repository.load())

    def update_settings(self, payload: UpdateUserSettingsRequest) -> UserSettingsResponse:
        patch = payload.model_dump(exclude_unset=True)

        if "user_voiceprint_profile_id" in patch:
            profile_id = patch["user_voiceprint_profile_id"]
            if profile_id is not None:
                VoiceprintProfileService(self.repository.session).get_profile(profile_id)

        if "user_name" in patch and patch["user_name"] is not None:
            name = patch["user_name"].strip()
            if len(name) > 100:
                raise AppError(
                    "USER_NAME_TOO_LONG",
                    "User name must be 100 characters or fewer.",
                )
            patch["user_name"] = name

        def apply_patch(current: dict[str, Any]) -> dict[str, Any]:
            for key, value in patch.items():
                if key not in DEFAULT_USER_SETTINGS:
                    continue
                if key in {"ui_language", "content_language"} and value not in {"en", "zh"}:
                    raise AppError("INVALID_LANGUAGE", "Language must be 'en' or 'zh'.")
                if key == "summary_style" and value not in {"concise", "balanced", "detailed"}:
                    raise AppError(
                        "INVALID_SUMMARY_STYLE",
                        "Summary style must be concise, balanced, or detailed.",
                    )
                if key == "summary_format" and value not in {"paragraphs", "bullets"}:
                    raise AppError(
                        "INVALID_SUMMARY_FORMAT",
                        "Summary format must be paragraphs or bullets.",
                    )
                current[key] = value
            return current

        updated = self.repository.update(apply_patch)
        return UserSettingsResponse.model_validate(updated)

    def clear_user_voiceprint_profile(self, profile_id: str) -> None:
        def apply_clear(current: dict[str, Any]) -> dict[str, Any]:
            if current.get("user_voiceprint_profile_id") != profile_id:
                return current
            current["user_voiceprint_profile_id"] = None
            return current

        self.repository.update(apply_clear)

    def clear_user_voiceprint_profile_if_set(self) -> None:
        def apply_clear(current: dict[str, Any]) -> dict[str, Any]:
            if not current.get("user_voiceprint_profile_id"):
                return current
            current["user_voiceprint_profile_id"] = None
            return current

        self.repository.update(apply_clear)
