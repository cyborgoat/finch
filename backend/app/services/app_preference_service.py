from datetime import UTC, datetime

from sqlmodel import Session

from app.config import Settings, get_settings
from app.models.app_preference import AppPreference

SPEAKER_MEMORY_CONSENT_KEY = "speaker_memory_consent_at"
SPEAKER_MEMORY_ENABLED_KEY = "speaker_memory_enabled"


class AppPreferenceService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()

    def get(self, key: str) -> str | None:
        pref = self.session.get(AppPreference, key)
        return pref.value if pref else None

    def set(self, key: str, value: str) -> AppPreference:
        now = datetime.now(UTC)
        pref = self.session.get(AppPreference, key)
        if pref is None:
            pref = AppPreference(key=key, value=value, updated_at=now)
        else:
            pref.value = value
            pref.updated_at = now
        self.session.add(pref)
        self.session.commit()
        self.session.refresh(pref)
        return pref

    def delete(self, key: str) -> None:
        pref = self.session.get(AppPreference, key)
        if pref is not None:
            self.session.delete(pref)
            self.session.commit()

    def get_speaker_memory_consent_at(self) -> datetime | None:
        raw = self.get(SPEAKER_MEMORY_CONSENT_KEY)
        if not raw:
            return None
        return datetime.fromisoformat(raw)

    def has_speaker_memory_consent(self) -> bool:
        return self.get_speaker_memory_consent_at() is not None

    def record_speaker_memory_consent(self) -> datetime:
        now = datetime.now(UTC)
        self.set(SPEAKER_MEMORY_CONSENT_KEY, now.isoformat())
        return now

    def is_speaker_memory_enabled(self) -> bool:
        raw = self.get(SPEAKER_MEMORY_ENABLED_KEY)
        if raw is None:
            return self.settings.speaker_memory_enabled
        return raw.lower() in {"1", "true", "yes", "on"}

    def set_speaker_memory_enabled(self, enabled: bool) -> None:
        self.set(SPEAKER_MEMORY_ENABLED_KEY, "true" if enabled else "false")

    def clear_speaker_memory_preferences(self) -> None:
        for key in (SPEAKER_MEMORY_CONSENT_KEY, SPEAKER_MEMORY_ENABLED_KEY):
            self.delete(key)
