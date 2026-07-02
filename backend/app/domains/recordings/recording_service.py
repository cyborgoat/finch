from dataclasses import dataclass
from datetime import UTC, datetime

from sqlmodel import Session, select

from app.core.enums import RecordingStatus
from app.core.errors import AppError
from app.core.ids import generate_recording_id
from app.models.audio_asset import AudioAsset
from app.models.recording import Recording


@dataclass(frozen=True)
class RecordingWithDuration:
    recording: Recording
    duration_seconds: float | None


class _Unset:
    pass


UNSET = _Unset()


class RecordingService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_recording(
        self,
        *,
        audio_asset_id: str,
        title: str,
        raw_text: str,
        language: str | None = None,
        status: str = RecordingStatus.DRAFT,
    ) -> Recording:
        now = datetime.now(UTC)
        transcript = Recording(
            id=generate_recording_id(),
            audio_asset_id=audio_asset_id,
            title=title,
            raw_text=raw_text,
            language=language,
            status=status,
            created_at=now,
            updated_at=now,
        )
        self.session.add(transcript)
        self.session.commit()
        self.session.refresh(transcript)
        return transcript

    def list_recordings(self) -> list[Recording]:
        statement = select(Recording).order_by(Recording.created_at.desc())
        return list(self.session.exec(statement).all())

    def list_with_durations(self) -> list[RecordingWithDuration]:
        recordings = self.list_recordings()
        audio_ids = {recording.audio_asset_id for recording in recordings}
        duration_by_audio_id: dict[str, float | None] = {}
        if audio_ids:
            audio_assets = self.session.exec(
                select(AudioAsset).where(AudioAsset.id.in_(audio_ids))
            ).all()
            duration_by_audio_id = {
                asset.id: asset.duration_seconds for asset in audio_assets
            }
        return [
            RecordingWithDuration(
                recording=recording,
                duration_seconds=duration_by_audio_id.get(recording.audio_asset_id),
            )
            for recording in recordings
        ]

    def get_recording(self, recording_id: str) -> Recording:
        recording = self.session.get(Recording, recording_id)
        if recording is None:
            raise AppError("RECORDING_NOT_FOUND", "Recording not found.", 404)
        return recording

    def update_recording(
        self,
        recording: Recording,
        *,
        title: str | None = None,
        raw_text: str | None = None,
        language: str | None = None,
        edited_text: str | None = None,
        speaker_segments: str | None = None,
        status: str | None = None,
        error_message: str | None | _Unset = UNSET,
        processing_note: str | None | _Unset = UNSET,
    ) -> Recording:
        if title is not None:
            recording.title = title
        if raw_text is not None:
            recording.raw_text = raw_text
        if language is not None:
            recording.language = language
        if edited_text is not None:
            recording.edited_text = edited_text
        if speaker_segments is not None:
            recording.speaker_segments = speaker_segments
        if status is not None:
            recording.status = status
        if error_message is not UNSET:
            recording.error_message = error_message
        if processing_note is not UNSET:
            recording.processing_note = processing_note
        recording.updated_at = datetime.now(UTC)
        self.session.add(recording)
        self.session.commit()
        self.session.refresh(recording)
        return recording

    def delete_recording(self, recording: Recording) -> None:
        self.session.delete(recording)
        self.session.commit()
