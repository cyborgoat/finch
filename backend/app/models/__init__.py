"""SQLModel table definitions — imported for metadata registration."""

from app.models.app_preference import AppPreference
from app.models.audio_asset import AudioAsset
from app.models.note import Note
from app.models.job import Job
from app.models.speaker_profile import SpeakerEmbedding, SpeakerProfile
from app.models.recording import Recording

__all__ = [
    "AppPreference",
    "AudioAsset",
    "Note",
    "Job",
    "SpeakerEmbedding",
    "SpeakerProfile",
    "Recording",
]
