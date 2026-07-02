from dataclasses import dataclass
from datetime import UTC, datetime

from sqlmodel import Session

from app.core.enums import RecordingStatus
from app.core.errors import AppError
from app.domains.jobs.job_service import JobService
from app.domains.jobs.queue import enqueue_transcription
from app.domains.media.audio_service import AudioService
from app.domains.recordings.presenter import normalize_recording_status
from app.domains.recordings.recording_service import RecordingService
from app.models.audio_asset import AudioAsset
from app.models.job import Job
from app.models.recording import Recording

TRANSCRIBABLE_STATUSES = frozenset(
    {
        RecordingStatus.PENDING,
        RecordingStatus.FAILED,
        RecordingStatus.DRAFT,
    }
)


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
class PendingRecordingResult:
    recording: Recording


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

    def create_recording(self, *, audio_asset_id: str) -> PendingRecordingResult:
        audio_asset = self.audio_service.get_audio(audio_asset_id)
        existing_titles = {
            recording.title for recording in self.recording_service.list_recordings()
        }
        title = resolve_recording_title(audio_asset, existing_titles)
        recording = self.recording_service.create_recording(
            audio_asset_id=audio_asset.id,
            title=title,
            raw_text="",
            status=RecordingStatus.PENDING,
        )
        return PendingRecordingResult(recording=recording)

    def start_transcription(
        self,
        recording_id: str,
        *,
        language: str = "auto",
        regenerate: bool = False,
    ) -> TranscriptionJobResult:
        recording = self.recording_service.get_recording(recording_id)
        if recording.status == RecordingStatus.TRANSCRIBING:
            raise AppError(
                "RECORDING_ALREADY_TRANSCRIBING",
                "This recording is already being transcribed.",
                409,
            )
        if normalize_recording_status(recording.status) not in TRANSCRIBABLE_STATUSES:
            raise AppError(
                "RECORDING_NOT_TRANSCRIBABLE",
                f"Recording status '{recording.status}' cannot be transcribed.",
                400,
            )

        if regenerate:
            recording = self.recording_service.update_recording(
                recording,
                raw_text="",
                edited_text="",
                speaker_segments="",
                error_message=None,
                processing_note=None,
            )

        recording = self.recording_service.update_recording(
            recording,
            status=RecordingStatus.TRANSCRIBING,
        )
        job = self.job_service.create_job("transcription")
        self.job_service.update_job(job, result_id=recording.id)
        enqueue_transcription(job.id, recording.audio_asset_id, language)
        return TranscriptionJobResult(job=job, recording=recording)

    def create_job(
        self,
        *,
        audio_asset_id: str,
        language: str = "auto",
    ) -> TranscriptionJobResult:
        """Legacy helper: create pending recording and start transcription immediately."""
        pending = self.create_recording(audio_asset_id=audio_asset_id)
        return self.start_transcription(
            pending.recording.id,
            language=language,
        )
