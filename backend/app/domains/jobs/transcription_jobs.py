from dataclasses import dataclass
from datetime import UTC, datetime

from sqlmodel import Session

from app.domains.jobs.job_service import JobService
from app.domains.jobs.queue import enqueue_transcription
from app.domains.media.audio_service import AudioService
from app.domains.recordings.recording_service import RecordingService
from app.models.audio_asset import AudioAsset
from app.models.job import Job
from app.models.recording import Recording


def default_recording_title(existing_titles: set[str]) -> str:
    base_title = datetime.now(UTC).strftime("Recording %Y-%m-%d %H:%M")
    if base_title not in existing_titles:
        return base_title

    suffix = 2
    while True:
        candidate = f"{base_title} ({suffix})"
        if candidate not in existing_titles:
            return candidate
        suffix += 1


def upload_recording_title(filename: str, existing_titles: set[str]) -> str:
    base_title = filename.rsplit(".", 1)[0] or "Untitled Recording"
    if base_title not in existing_titles:
        return base_title

    suffix = 2
    while True:
        candidate = f"{base_title} ({suffix})"
        if candidate not in existing_titles:
            return candidate
        suffix += 1


def resolve_recording_title(
    audio_asset: AudioAsset,
    existing_titles: set[str],
) -> str:
    if audio_asset.source == "recording":
        return default_recording_title(existing_titles)
    return upload_recording_title(audio_asset.filename, existing_titles)


@dataclass(frozen=True)
class TranscriptionJobResult:
    job: Job
    recording: Recording


class TranscriptionJobService:
    def __init__(
        self,
        session: Session,
        *,
        audio_service: AudioService | None = None,
        recording_service: RecordingService | None = None,
        job_service: JobService | None = None,
    ) -> None:
        self.session = session
        self.audio_service = audio_service or AudioService(session)
        self.recording_service = recording_service or RecordingService(session)
        self.job_service = job_service or JobService(session)

    def create_job(
        self,
        *,
        audio_asset_id: str,
        language: str = "auto",
    ) -> TranscriptionJobResult:
        audio_asset = self.audio_service.get_audio(audio_asset_id)
        existing_titles = {
            recording.title for recording in self.recording_service.list_recordings()
        }
        title = resolve_recording_title(audio_asset, existing_titles)
        recording = self.recording_service.create_recording(
            audio_asset_id=audio_asset.id,
            title=title,
            raw_text="",
            status="transcribing",
        )
        job = self.job_service.create_job("transcription")
        self.job_service.update_job(job, result_id=recording.id)
        enqueue_transcription(job.id, audio_asset_id, language)
        return TranscriptionJobResult(job=job, recording=recording)
