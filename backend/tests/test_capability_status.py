from app.capabilities.status import get_capability_status
from app.config import Settings
from app.domains.settings.app_preference_service import AppPreferenceService
from app.domains.settings.transcription_settings_service import TranscriptionSettingsService
from app.schemas.transcription_settings import UpdateTranscriptionSettingsRequest


def test_capability_status_voiceprint_profiles_independent_of_auto_label(db_session):
    settings = Settings(
        diarization_enabled=True,
        voiceprint_profiles_enabled=True,
        hf_token=None,
    )
    transcription_service = TranscriptionSettingsService(db_session, settings)
    transcription_service.update_settings(
        UpdateTranscriptionSettingsRequest(
            diarization_enabled=True,
            voiceprint_profiles_enabled=True,
            voiceprint_auto_label_enabled=False,
        )
    )

    status = get_capability_status(settings, db_session)
    assert status.voiceprint_profiles_enabled is True


def test_capability_status_auto_label_does_not_replace_profiles_enabled(db_session):
    settings = Settings(
        diarization_enabled=True,
        voiceprint_profiles_enabled=False,
        hf_token=None,
    )
    transcription_service = TranscriptionSettingsService(db_session, settings)
    transcription_service.update_settings(
        UpdateTranscriptionSettingsRequest(
            voiceprint_auto_label_enabled=True,
        )
    )

    status = get_capability_status(settings, db_session)
    assert status.voiceprint_profiles_enabled is False


def test_transcription_settings_migrates_legacy_auto_label_preference(db_session):
    settings = Settings()
    preferences = AppPreferenceService(db_session)
    preferences.set_voiceprint_auto_label_enabled(True)

    transcription_service = TranscriptionSettingsService(db_session, settings)
    assert transcription_service.is_voiceprint_auto_label_enabled() is True
    assert transcription_service._load_raw().get("voiceprint_auto_label_enabled") is True
