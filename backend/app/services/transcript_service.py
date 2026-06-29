from datetime import UTC, datetime

from sqlmodel import Session, select

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.core.ids import generate_transcript_id
from app.models.transcript import Transcript


class _Unset:
    pass


UNSET = _Unset()


class TranscriptService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()

    def create_transcript(
        self,
        *,
        audio_asset_id: str,
        title: str,
        raw_text: str,
        language: str | None = None,
        status: str = "draft",
    ) -> Transcript:
        now = datetime.now(UTC)
        transcript = Transcript(
            id=generate_transcript_id(),
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

    def list_transcripts(self) -> list[Transcript]:
        statement = select(Transcript).order_by(Transcript.created_at.desc())
        return list(self.session.exec(statement).all())

    def get_transcript(self, transcript_id: str) -> Transcript:
        transcript = self.session.get(Transcript, transcript_id)
        if transcript is None:
            raise AppError("TRANSCRIPT_NOT_FOUND", "Transcript not found.", 404)
        return transcript

    def update_transcript(
        self,
        transcript: Transcript,
        *,
        title: str | None = None,
        raw_text: str | None = None,
        language: str | None = None,
        edited_text: str | None = None,
        speaker_segments: str | None = None,
        status: str | None = None,
        error_message: str | None | _Unset = UNSET,
        processing_note: str | None | _Unset = UNSET,
    ) -> Transcript:
        if title is not None:
            transcript.title = title
        if raw_text is not None:
            transcript.raw_text = raw_text
        if language is not None:
            transcript.language = language
        if edited_text is not None:
            transcript.edited_text = edited_text
        if speaker_segments is not None:
            transcript.speaker_segments = speaker_segments
        if status is not None:
            transcript.status = status
        if error_message is not UNSET:
            transcript.error_message = error_message
        if processing_note is not UNSET:
            transcript.processing_note = processing_note
        transcript.updated_at = datetime.now(UTC)
        self.session.add(transcript)
        self.session.commit()
        self.session.refresh(transcript)
        return transcript

    def delete_transcript(self, transcript: Transcript) -> None:
        self.session.delete(transcript)
        self.session.commit()
