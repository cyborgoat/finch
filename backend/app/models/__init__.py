"""SQLModel table definitions — imported for metadata registration."""

from app.models.app_preference import AppPreference
from app.models.audio_asset import AudioAsset
from app.models.note import Note
from app.models.job import Job
from app.models.voiceprint_profile import VoiceprintEmbedding, VoiceprintProfile
from app.models.recording import Recording

__all__ = [
    "AppPreference",
    "AudioAsset",
    "Note",
    "Job",
    "VoiceprintEmbedding",
    "VoiceprintProfile",
    "Recording",
]
