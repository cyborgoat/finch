from app.core.errors import AppError
from app.domains.settings.app_preference_service import AppPreferenceService
from app.domains.settings.transcription_settings_service import TranscriptionSettingsService


def require_voiceprint_profiles_consent(
    preference_service: AppPreferenceService,
) -> None:
    if not preference_service.has_voiceprint_profiles_consent():
        raise AppError(
            "VOICEPRINT_PROFILES_CONSENT_REQUIRED",
            "Voiceprint profile consent is required before saving voiceprint samples.",
            400,
        )


def require_voiceprint_profiles_enabled(
    transcription_settings: TranscriptionSettingsService,
) -> None:
    if not transcription_settings.is_voiceprint_profiles_enabled():
        raise AppError(
            "VOICEPRINT_PROFILES_DISABLED",
            "Voiceprint profiles are disabled. Enable them in Settings → Transcription.",
            400,
        )
