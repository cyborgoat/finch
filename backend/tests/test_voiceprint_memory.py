from app.core.errors import AppError
from app.services.voiceprint_profile_service import VoiceprintProfileService


def test_voiceprint_profile_requires_consent_for_enroll(db_session, test_settings):
    profile_service = VoiceprintProfileService(db_session, test_settings)

    try:
        profile_service.enroll_from_transcript(
            recording_id="recording_missing",
            cluster_id="SPEAKER_00",
            display_name="Alex",
        )
    except AppError as exc:
        assert exc.code == "SPEAKER_MEMORY_CONSENT_REQUIRED"
    else:
        raise AssertionError("Expected consent error")
