import json
from typing import Any

from sqlmodel import Session

from app.config import Settings, get_settings
from app.core.startup_diagnostics import (
    get_diarization_status,
    get_speaker_memory_status_for_preferences,
)
from app.services.diarization_service import resolve_hf_token
from app.schemas.transcription_settings import (
    TranscriptionSettingsResponse,
    UpdateTranscriptionSettingsRequest,
)
from app.services.app_preference_service import AppPreferenceService

TRANSCRIPTION_SETTINGS_KEY = "transcription_settings"


class TranscriptionSettingsService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.preferences = AppPreferenceService(session, self.settings)

    def get_settings(self) -> TranscriptionSettingsResponse:
        stored = self._load_raw()
        diarization_enabled = bool(stored.get("diarization_enabled"))
        speaker_memory_enabled = bool(stored.get("speaker_memory_enabled"))
        speaker_auto_label_enabled = self._resolve_auto_label_enabled(stored)
        hf_token = resolve_hf_token(self.settings)

        diarization_ready, diarization_reason = self._diarization_status(
            diarization_enabled,
            hf_token,
        )
        memory_status = get_speaker_memory_status_for_preferences(
            diarization_enabled=diarization_enabled,
            speaker_memory_enabled=speaker_memory_enabled,
            hf_token=hf_token,
            settings=self.settings,
        )

        return TranscriptionSettingsResponse(
            diarization_enabled=diarization_enabled,
            diarization_ready=diarization_ready,
            diarization_reason=diarization_reason,
            speaker_memory_enabled=speaker_memory_enabled,
            speaker_memory_ready=memory_status.ready and speaker_memory_enabled,
            speaker_memory_reason=memory_status.reason,
            speaker_auto_label_enabled=speaker_auto_label_enabled,
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

        if "speaker_memory_enabled" in patch:
            current["speaker_memory_enabled"] = bool(patch["speaker_memory_enabled"])

        if "speaker_auto_label_enabled" in patch:
            enabled = bool(patch["speaker_auto_label_enabled"])
            current["speaker_auto_label_enabled"] = enabled
            self.preferences.set_speaker_auto_label_enabled(enabled)

        self._save_raw(current)
        return self.get_settings()

    def is_diarization_enabled(self) -> bool:
        stored = self._load_raw()
        if stored:
            return bool(stored.get("diarization_enabled"))
        return self.settings.diarization_enabled

    def is_speaker_memory_enabled(self) -> bool:
        stored = self._load_raw()
        if stored:
            return bool(stored.get("speaker_memory_enabled"))
        return self.settings.speaker_memory_enabled

    def is_speaker_auto_label_enabled(self) -> bool:
        stored = self._load_raw()
        return self._resolve_auto_label_enabled(stored)

    def get_hf_token(self) -> str | None:
        return resolve_hf_token(self.settings)

    def _resolve_auto_label_enabled(self, stored: dict[str, Any]) -> bool:
        if "speaker_auto_label_enabled" in stored:
            return bool(stored["speaker_auto_label_enabled"])
        return self.preferences.is_speaker_auto_label_enabled()

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
        raw = self.preferences.get(TRANSCRIPTION_SETTINGS_KEY)
        if not raw:
            return {}
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}

    def _save_raw(self, data: dict[str, Any]) -> None:
        self.preferences.set(TRANSCRIPTION_SETTINGS_KEY, json.dumps(data))
