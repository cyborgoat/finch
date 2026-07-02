from fastapi import Depends
from sqlmodel import Session

from app.domains.ai.action_jobs import AiActionJobService
from app.domains.ai.action_service import AiActionService
from app.domains.jobs.job_service import JobService
from app.domains.jobs.transcription_jobs import TranscriptionJobService
from app.domains.media.audio_service import AudioService
from app.domains.recordings.note_service import NoteService
from app.domains.recordings.recording_service import RecordingService
from app.domains.recordings.speaker_service import RecordingSpeakerService
from app.domains.settings.app_preference_service import AppPreferenceService
from app.domains.settings.llm_settings_service import LlmSettingsService
from app.domains.settings.transcription_settings_service import TranscriptionSettingsService
from app.domains.settings.user_settings_service import UserSettingsService
from app.domains.voiceprint.profile_service import VoiceprintProfileService
from app.storage.database import get_session


def get_recording_service(session: Session = Depends(get_session)) -> RecordingService:
    return RecordingService(session)


def get_audio_service(session: Session = Depends(get_session)) -> AudioService:
    return AudioService(session)


def get_job_service(session: Session = Depends(get_session)) -> JobService:
    return JobService(session)


def get_note_service(session: Session = Depends(get_session)) -> NoteService:
    return NoteService(session)


def get_voiceprint_profile_service(
    session: Session = Depends(get_session),
) -> VoiceprintProfileService:
    return VoiceprintProfileService(session)


def get_user_settings_service(session: Session = Depends(get_session)) -> UserSettingsService:
    return UserSettingsService(session)


def get_llm_settings_service(session: Session = Depends(get_session)) -> LlmSettingsService:
    return LlmSettingsService(session)


def get_transcription_settings_service(
    session: Session = Depends(get_session),
) -> TranscriptionSettingsService:
    return TranscriptionSettingsService(session)


def get_app_preference_service(session: Session = Depends(get_session)) -> AppPreferenceService:
    return AppPreferenceService(session)


def get_recording_speaker_service(
    session: Session = Depends(get_session),
) -> RecordingSpeakerService:
    return RecordingSpeakerService(session)


def get_ai_action_service(session: Session = Depends(get_session)) -> AiActionService:
    return AiActionService(session)


def get_transcription_job_service(
    session: Session = Depends(get_session),
) -> TranscriptionJobService:
    return TranscriptionJobService(session)


def get_ai_action_job_service(
    session: Session = Depends(get_session),
) -> AiActionJobService:
    return AiActionJobService(session)
