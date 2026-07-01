from datetime import UTC, datetime

from sqlmodel import Session

from app.config import Settings, get_settings
from app.models.app_preference import AppPreference

VOICEPRINT_PROFILES_CONSENT_KEY = "voiceprint_profiles_consent_at"
VOICEPRINT_AUTO_LABEL_KEY = "voiceprint_auto_label_enabled"
LEGACY_SPEAKER_MEMORY_CONSENT_KEY = "speaker_memory_consent_at"
LEGACY_SPEAKER_MEMORY_ENABLED_KEY = "speaker_memory_enabled"
LEGACY_SPEAKER_AUTO_LABEL_KEY = "speaker_auto_label_enabled"


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

    def get_voiceprint_profiles_consent_at(self) -> datetime | None:
        raw = self.get(VOICEPRINT_PROFILES_CONSENT_KEY) or self.get(
            LEGACY_SPEAKER_MEMORY_CONSENT_KEY
        )
        if not raw:
            return None
        return datetime.fromisoformat(raw)

    def has_voiceprint_profiles_consent(self) -> bool:
        return self.get_voiceprint_profiles_consent_at() is not None

    def record_voiceprint_profiles_consent(self) -> datetime:
        now = datetime.now(UTC)
        self.set(VOICEPRINT_PROFILES_CONSENT_KEY, now.isoformat())
        self.delete(LEGACY_SPEAKER_MEMORY_CONSENT_KEY)
        return now

    def is_voiceprint_auto_label_enabled(self) -> bool:
        raw = self.get(VOICEPRINT_AUTO_LABEL_KEY)
        if raw is not None:
            return raw.lower() in {"1", "true", "yes", "on"}
        for legacy_key in (LEGACY_SPEAKER_AUTO_LABEL_KEY, LEGACY_SPEAKER_MEMORY_ENABLED_KEY):
            legacy = self.get(legacy_key)
            if legacy is not None:
                return legacy.lower() in {"1", "true", "yes", "on"}
        return False

    def set_voiceprint_auto_label_enabled(self, enabled: bool) -> None:
        value = "true" if enabled else "false"
        self.set(VOICEPRINT_AUTO_LABEL_KEY, value)
        self.delete(LEGACY_SPEAKER_AUTO_LABEL_KEY)
        self.delete(LEGACY_SPEAKER_MEMORY_ENABLED_KEY)

    def clear_voiceprint_profiles_preferences(self) -> None:
        for key in (
            VOICEPRINT_PROFILES_CONSENT_KEY,
            VOICEPRINT_AUTO_LABEL_KEY,
            LEGACY_SPEAKER_MEMORY_CONSENT_KEY,
            LEGACY_SPEAKER_MEMORY_ENABLED_KEY,
            LEGACY_SPEAKER_AUTO_LABEL_KEY,
        ):
            self.delete(key)
