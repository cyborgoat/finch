from dataclasses import dataclass
from typing import Literal

from sqlmodel import Session

from app.config import Settings, get_settings
from app.core.enums import RecordingStatus
from app.core.naming import ensure_unique_title
from app.domains.media.audio_edit_service import AudioEditService, cleanup_processed
from app.domains.media.audio_service import AudioService
from app.domains.recordings.recording_service import RecordingService
from app.models.recording import Recording


@dataclass(frozen=True)
class EditRecordingSourceResult:
    recording_id: str
    audio_asset_id: str
    status: str
    duration_seconds: float | None


class RecordingSourceEditService:
    def __init__(
        self,
        session: Session,
        *,
        settings: Settings | None = None,
        audio_service: AudioService | None = None,
        recording_service: RecordingService | None = None,
        audio_edit_service: AudioEditService | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.audio_service = audio_service or AudioService(session, self.settings)
        self.recording_service = recording_service or RecordingService(session)
        self.audio_edit_service = audio_edit_service or AudioEditService(self.settings)

    def edit_source(
        self,
        recording_id: str,
        *,
        trim_start_sec: float = 0.0,
        trim_end_sec: float | None = None,
        remove_silence: bool = False,
        mode: Literal["replace", "save_as_new"],
    ) -> EditRecordingSourceResult:
        recording = self.recording_service.get_recording(recording_id)
        audio_asset = self.audio_service.get_audio(recording.audio_asset_id)
        source_path, _ = self.audio_service.get_playback_path(audio_asset)

        processed = self.audio_edit_service.process(
            str(source_path),
            trim_start_sec=trim_start_sec,
            trim_end_sec=trim_end_sec,
            remove_silence=remove_silence,
        )
        try:
            if mode == "replace":
                updated_asset = self.audio_service.replace_from_processed_file(
                    audio_asset,
                    processed.path,
                )
                updated_recording = self.recording_service.reset_source(recording)
                return EditRecordingSourceResult(
                    recording_id=updated_recording.id,
                    audio_asset_id=updated_asset.id,
                    status=updated_recording.status,
                    duration_seconds=updated_asset.duration_seconds,
                )

            edited_title = self._edited_recording_title(recording.title)
            new_asset = self.audio_service.create_from_processed_file(
                processed.path,
                source=audio_asset.source,
                filename=f"{edited_title}.wav",
            )
            new_recording = self.recording_service.create_from_edited_source(
                new_asset.id,
                title=edited_title,
            )
            return EditRecordingSourceResult(
                recording_id=new_recording.id,
                audio_asset_id=new_asset.id,
                status=new_recording.status,
                duration_seconds=new_asset.duration_seconds,
            )
        finally:
            cleanup_processed(processed)

    def _edited_recording_title(self, title: str) -> str:
        base_title = f"{title} (edited)"
        existing_titles = {
            recording.title for recording in self.recording_service.list_recordings()
        }
        return ensure_unique_title(base_title, existing_titles)
