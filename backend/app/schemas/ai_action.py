from app.schemas import CamelModel


class CreateAiActionRequest(CamelModel):
    recording_id: str
    action: str = "meeting_summary"
    source: str = "editedText"
    model: str | None = None


class CreateAiActionResponse(CamelModel):
    job_id: str
    note_id: str
    status: str


class AiActionTemplate(CamelModel):
    id: str
    title: str
    description: str
    note_type: str


class AiActionTemplateListResponse(CamelModel):
    items: list[AiActionTemplate]
