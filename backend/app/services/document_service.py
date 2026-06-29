from datetime import UTC, datetime

from sqlmodel import Session, select

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.core.ids import generate_document_id
from app.models.document import Document


class DocumentService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()

    def create_document(
        self,
        *,
        transcript_id: str,
        title: str,
        doc_type: str,
        markdown: str,
        model: str,
        prompt_version: str = "v1",
    ) -> Document:
        now = datetime.now(UTC)
        document = Document(
            id=generate_document_id(),
            transcript_id=transcript_id,
            title=title,
            type=doc_type,
            markdown=markdown,
            model=model,
            prompt_version=prompt_version,
            created_at=now,
            updated_at=now,
        )
        self.session.add(document)
        self.session.commit()
        self.session.refresh(document)
        return document

    def list_documents(self, transcript_id: str | None = None) -> list[Document]:
        statement = select(Document).order_by(Document.created_at.desc())
        if transcript_id:
            statement = statement.where(Document.transcript_id == transcript_id)
        return list(self.session.exec(statement).all())

    def get_document(self, document_id: str) -> Document:
        document = self.session.get(Document, document_id)
        if document is None:
            raise AppError("DOCUMENT_NOT_FOUND", "Document not found.", 404)
        return document

    def update_document(
        self,
        document: Document,
        *,
        title: str | None = None,
        markdown: str | None = None,
    ) -> Document:
        if title is not None:
            document.title = title
        if markdown is not None:
            document.markdown = markdown
        document.updated_at = datetime.now(UTC)
        self.session.add(document)
        self.session.commit()
        self.session.refresh(document)
        return document

    def delete_document(self, document: Document) -> None:
        self.session.delete(document)
        self.session.commit()

    def delete_by_transcript(self, transcript_id: str) -> None:
        for document in self.list_documents(transcript_id=transcript_id):
            self.session.delete(document)
        self.session.commit()
