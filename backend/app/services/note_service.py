from datetime import UTC, datetime

from sqlmodel import Session, select

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.core.ids import generate_note_id
from app.models.note import Note


class NoteService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()

    def create_note(
        self,
        *,
        recording_id: str,
        title: str,
        note_type: str,
        markdown: str,
        model: str,
        prompt_version: str = "v1",
        status: str = "ready",
        generation_job_id: str | None = None,
    ) -> Note:
        now = datetime.now(UTC)
        document = Note(
            id=generate_note_id(),
            recording_id=recording_id,
            title=title,
            type=note_type,
            markdown=markdown,
            model=model,
            prompt_version=prompt_version,
            status=status,
            generation_job_id=generation_job_id,
            created_at=now,
            updated_at=now,
        )
        self.session.add(document)
        self.session.commit()
        self.session.refresh(document)
        return document

    def create_generating_note(
        self,
        *,
        recording_id: str,
        title: str,
        note_type: str,
        generation_job_id: str,
        model: str = "pending",
    ) -> Note:
        return self.create_note(
            recording_id=recording_id,
            title=title,
            note_type=note_type,
            markdown="",
            model=model,
            status="generating",
            generation_job_id=generation_job_id,
        )

    def create_manual_note(
        self,
        *,
        recording_id: str,
        title: str | None = None,
        markdown: str = "",
        note_type: str = "note",
    ) -> Note:
        resolved_title = title.strip() if title and title.strip() else self._default_manual_title()
        return self.create_note(
            recording_id=recording_id,
            title=resolved_title,
            note_type=note_type,
            markdown=markdown,
            model="manual",
        )

    @staticmethod
    def _default_manual_title() -> str:
        date_label = datetime.now(UTC).strftime("%b %d, %Y")
        return f"Note · {date_label}"

    def list_notes(self, recording_id: str | None = None) -> list[Note]:
        statement = select(Note).order_by(Note.created_at.desc())
        if recording_id:
            statement = statement.where(Note.recording_id == recording_id)
        return list(self.session.exec(statement).all())

    def get_note(self, note_id: str) -> Note:
        document = self.session.get(Note, note_id)
        if document is None:
            raise AppError("NOTE_NOT_FOUND", "Note not found.", 404)
        return document

    def update_note(
        self,
        document: Note,
        *,
        title: str | None = None,
        markdown: str | None = None,
        model: str | None = None,
        status: str | None = None,
        generation_job_id: str | None = None,
        clear_generation_job_id: bool = False,
    ) -> Note:
        if title is not None:
            document.title = title
        if markdown is not None:
            document.markdown = markdown
        if model is not None:
            document.model = model
        if status is not None:
            document.status = status
        if clear_generation_job_id:
            document.generation_job_id = None
        elif generation_job_id is not None:
            document.generation_job_id = generation_job_id
        document.updated_at = datetime.now(UTC)
        self.session.add(document)
        self.session.commit()
        self.session.refresh(document)
        return document

    def delete_note(self, document: Note) -> None:
        self.session.delete(document)
        self.session.commit()

    def delete_by_recording(self, recording_id: str) -> None:
        for document in self.list_notes(recording_id=recording_id):
            self.session.delete(document)
        self.session.commit()
