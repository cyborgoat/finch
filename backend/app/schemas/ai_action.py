from app.schemas import CamelModel


class CreateAiActionRequest(CamelModel):
    transcript_id: str
    action: str = "meeting_summary"
    source: str = "editedText"
    model: str | None = None


class CreateAiActionResponse(CamelModel):
    job_id: str
    document_id: str
    status: str


class AiActionTemplate(CamelModel):
    id: str
    title: str
    description: str
    doc_type: str


class AiActionTemplateListResponse(CamelModel):
    items: list[AiActionTemplate]
