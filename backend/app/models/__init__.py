"""SQLModel table definitions — imported for metadata registration."""

from app.models.app_preference import AppPreference
from app.models.audio_asset import AudioAsset
from app.models.job import Job
from app.models.note import Note
from app.models.recording import Recording
from app.models.voiceprint_profile import VoiceprintEmbedding, VoiceprintProfile

__all__ = [
    "AppPreference",
    "AudioAsset",
    "Note",
    "Job",
    "VoiceprintEmbedding",
    "VoiceprintProfile",
    "Recording",
]
