from app.schemas import CamelModel


class CreateAiActionRequest(CamelModel):
    transcript_id: str
    action: str = "markdown_summary"
    source: str = "editedText"
    model: str | None = None


class CreateAiActionResponse(CamelModel):
    job_id: str
    status: str
