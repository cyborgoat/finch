from typing import Any

from sqlmodel import Session

from app.capabilities.status import (
    get_diarization_status,
    get_voiceprint_profiles_status_for_preferences,
)
from app.config import Settings, get_settings
from app.domains.settings.app_preference_service import AppPreferenceService
from app.domains.settings.preference_store import JsonPreferenceStore
from app.domains.transcription.diarization_service import resolve_hf_token
from app.schemas.transcription_settings import (
    TranscriptionSettingsResponse,
    UpdateTranscriptionSettingsRequest,
)

TRANSCRIPTION_SETTINGS_KEY = "transcription_settings"


class TranscriptionSettingsService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.store = JsonPreferenceStore(session)
        self.preferences = AppPreferenceService(session)

    def get_settings(self) -> TranscriptionSettingsResponse:
        stored = self._load_raw()
        diarization_enabled = bool(stored.get("diarization_enabled"))
        voiceprint_profiles_enabled = self._resolve_voiceprint_profiles_enabled(stored)
        voiceprint_auto_label_enabled = self._resolve_voiceprint_auto_label_enabled(stored)
        hf_token = resolve_hf_token(self.settings)

        diarization_ready, diarization_reason = self._diarization_status(
            diarization_enabled,
            hf_token,
        )
        profiles_status = get_voiceprint_profiles_status_for_preferences(
            diarization_enabled=diarization_enabled,
            voiceprint_profiles_enabled=voiceprint_profiles_enabled,
            hf_token=hf_token,
            settings=self.settings,
        )

        return TranscriptionSettingsResponse(
            diarization_enabled=diarization_enabled,
            diarization_ready=diarization_ready,
            diarization_reason=diarization_reason,
            voiceprint_profiles_enabled=voiceprint_profiles_enabled,
            voiceprint_profiles_ready=profiles_status.ready and voiceprint_profiles_enabled,
            voiceprint_profiles_reason=profiles_status.reason,
            voiceprint_auto_label_enabled=voiceprint_auto_label_enabled,
            source="stored" if stored else "unset",
        )

    def update_settings(
        self,
        payload: UpdateTranscriptionSettingsRequest,
    ) -> TranscriptionSettingsResponse:
        current = self._load_raw()
        patch = payload.model_dump(exclude_unset=True)

        if "diarization_enabled" in patch:
            current["diarization_enabled"] = bool(patch["diarization_enabled"])

        if "voiceprint_profiles_enabled" in patch:
            current["voiceprint_profiles_enabled"] = bool(patch["voiceprint_profiles_enabled"])

        if "voiceprint_auto_label_enabled" in patch:
            enabled = bool(patch["voiceprint_auto_label_enabled"])
            current["voiceprint_auto_label_enabled"] = enabled
            self.preferences.set_voiceprint_auto_label_enabled(enabled)

        self._save_raw(current)
        return self.get_settings()

    def is_diarization_enabled(self) -> bool:
        stored = self._load_raw()
        if stored:
            return bool(stored.get("diarization_enabled"))
        return self.settings.diarization_enabled

    def is_voiceprint_profiles_enabled(self) -> bool:
        stored = self._load_raw()
        if stored:
            return self._resolve_voiceprint_profiles_enabled(stored)
        return self.settings.voiceprint_profiles_enabled

    def is_voiceprint_auto_label_enabled(self) -> bool:
        stored = self._load_raw()
        return self._resolve_voiceprint_auto_label_enabled(stored)

    def get_hf_token(self) -> str | None:
        return resolve_hf_token(self.settings)

    def _resolve_voiceprint_profiles_enabled(self, stored: dict[str, Any]) -> bool:
        if "voiceprint_profiles_enabled" in stored:
            return bool(stored["voiceprint_profiles_enabled"])
        return self.settings.voiceprint_profiles_enabled

    def _resolve_voiceprint_auto_label_enabled(self, stored: dict[str, Any]) -> bool:
        if "voiceprint_auto_label_enabled" in stored:
            return bool(stored["voiceprint_auto_label_enabled"])
        return self.preferences.is_voiceprint_auto_label_enabled()

    def _diarization_status(
        self,
        enabled: bool,
        hf_token: str | None,
    ) -> tuple[bool, str | None]:
        if not enabled:
            return True, None

        return get_diarization_status(
            enabled=enabled,
            hf_token=hf_token,
            settings=self.settings,
        )

    def _load_raw(self) -> dict[str, Any]:
        return self.store.load(TRANSCRIPTION_SETTINGS_KEY)

    def _save_raw(self, data: dict[str, Any]) -> None:
        self.store.save(TRANSCRIPTION_SETTINGS_KEY, data)
