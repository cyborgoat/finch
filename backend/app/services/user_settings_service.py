import json
from typing import Any

from sqlmodel import Session

from app.core.errors import AppError
from app.schemas.user_settings import UpdateUserSettingsRequest, UserSettingsResponse
from app.services.app_preference_service import AppPreferenceService
from app.services.voiceprint_profile_service import VoiceprintProfileService

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


class UserSettingsService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.preferences = AppPreferenceService(session)

    def get_settings(self) -> UserSettingsResponse:
        return UserSettingsResponse.model_validate(self._load_raw())

    def update_settings(self, payload: UpdateUserSettingsRequest) -> UserSettingsResponse:
        current = self._load_raw()
        patch = payload.model_dump(exclude_unset=True)

        if "user_voiceprint_profile_id" in patch:
            profile_id = patch["user_voiceprint_profile_id"]
            if profile_id is not None:
                VoiceprintProfileService(self.session).get_profile(profile_id)

        if "user_name" in patch and patch["user_name"] is not None:
            name = patch["user_name"].strip()
            if len(name) > 100:
                raise AppError(
                    "USER_NAME_TOO_LONG",
                    "User name must be 100 characters or fewer.",
                )
            patch["user_name"] = name

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

        self._save_raw(current)
        return UserSettingsResponse.model_validate(current)

    def clear_user_voiceprint_profile(self, profile_id: str) -> None:
        current = self._load_raw()
        if current.get("user_voiceprint_profile_id") != profile_id:
            return
        current["user_voiceprint_profile_id"] = None
        self._save_raw(current)

    def clear_user_voiceprint_profile_if_set(self) -> None:
        current = self._load_raw()
        if not current.get("user_voiceprint_profile_id"):
            return
        current["user_voiceprint_profile_id"] = None
        self._save_raw(current)

    def _load_raw(self) -> dict[str, Any]:
        raw = self.preferences.get(USER_SETTINGS_KEY)
        if not raw:
            return dict(DEFAULT_USER_SETTINGS)

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return dict(DEFAULT_USER_SETTINGS)

        if not isinstance(parsed, dict):
            return dict(DEFAULT_USER_SETTINGS)

        merged = dict(DEFAULT_USER_SETTINGS)
        for key in DEFAULT_USER_SETTINGS:
            if key in parsed:
                merged[key] = parsed[key]

        if "language" in parsed:
            legacy = parsed["language"]
            if legacy in {"en", "zh"}:
                if "ui_language" not in parsed:
                    merged["ui_language"] = legacy
                if "content_language" not in parsed:
                    merged["content_language"] = legacy

        if merged.get("user_voiceprint_profile_id") is None and parsed.get("user_speaker_profile_id"):
            merged["user_voiceprint_profile_id"] = parsed["user_speaker_profile_id"]

        return merged

    def _save_raw(self, settings: dict[str, Any]) -> None:
        self.preferences.set(USER_SETTINGS_KEY, json.dumps(settings))
