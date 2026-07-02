from dataclasses import dataclass

from sqlmodel import Session

from app.domains.jobs.job_service import JobService
from app.domains.jobs.queue import enqueue_transcription
from app.domains.media.audio_service import AudioService
from app.domains.recordings.recording_service import RecordingService
from app.models.job import Job
from app.models.recording import Recording


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
        title = audio_asset.filename.rsplit(".", 1)[0] or "Untitled Recording"
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
