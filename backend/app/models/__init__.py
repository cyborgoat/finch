"""SQLModel table definitions — imported for metadata registration."""

from app.models.app_preference import AppPreference
from app.models.audio_asset import AudioAsset
from app.models.document import Document
from app.models.job import Job
from app.models.speaker_profile import SpeakerEmbedding, SpeakerProfile
from app.models.transcript import Transcript

__all__ = [
    "AppPreference",
    "AudioAsset",
    "Document",
    "Job",
    "SpeakerEmbedding",
    "SpeakerProfile",
    "Transcript",
]
