from app.schemas import CamelModel


class AiActionTemplate(CamelModel):
    id: str
    name: str
    description: str


class AiActionTemplateListResponse(CamelModel):
    items: list[AiActionTemplate]


class CreateAiActionRequest(CamelModel):
    transcript_id: str
    action: str
    source: str = "editedText"
    model: str | None = None
    custom_prompt: str | None = None


class CreateAiActionResponse(CamelModel):
    job_id: str
    status: str
