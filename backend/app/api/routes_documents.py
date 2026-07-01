from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.models.document import Document
from app.schemas.audio import OkResponse
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentSummary,
    UpdateDocumentRequest,
    UpdateDocumentResponse,
)
from app.services.document_service import DocumentService
from app.storage.database import get_session

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_summary(document: Document) -> DocumentSummary:
    return DocumentSummary.model_validate(document)


def _to_response(document: Document) -> DocumentResponse:
    return DocumentResponse.model_validate(document)


@router.get("", response_model=DocumentListResponse)
def list_documents(
    transcript_id: str | None = Query(None, alias="transcriptId"),
    session: Session = Depends(get_session),
) -> DocumentListResponse:
    service = DocumentService(session)
    items = [_to_summary(document) for document in service.list_documents(transcript_id)]
    return DocumentListResponse(items=items)


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    session: Session = Depends(get_session),
) -> DocumentResponse:
    service = DocumentService(session)
    return _to_response(service.get_document(document_id))


@router.patch("/{document_id}", response_model=UpdateDocumentResponse)
def update_document(
    document_id: str,
    payload: UpdateDocumentRequest,
    session: Session = Depends(get_session),
) -> UpdateDocumentResponse:
    service = DocumentService(session)
    document = service.get_document(document_id)
    updated = service.update_document(
        document,
        title=payload.title,
        markdown=payload.markdown,
    )
    return UpdateDocumentResponse(
        id=updated.id,
        title=updated.title,
        markdown=updated.markdown,
        updated_at=updated.updated_at,
    )


@router.delete("/{document_id}", response_model=OkResponse)
def delete_document(
    document_id: str,
    session: Session = Depends(get_session),
) -> OkResponse:
    service = DocumentService(session)
    document = service.get_document(document_id)
    service.delete_document(document)
    return OkResponse()
