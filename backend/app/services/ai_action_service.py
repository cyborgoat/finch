from pathlib import Path

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.models.transcript import Transcript
from app.services.llm_service import LlmService

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

ACTION_TEMPLATES = [
    {
        "id": "markdown_summary",
        "name": "Markdown Summary",
        "description": "Generate a structured Markdown summary.",
        "prompt_file": "summarize_markdown.md",
        "doc_type": "markdown_summary",
        "title_prefix": "Summary",
    },
    {
        "id": "action_items",
        "name": "Action Items",
        "description": "Extract action items as Markdown checkboxes.",
        "prompt_file": "action_items.md",
        "doc_type": "action_items",
        "title_prefix": "Action Items",
    },
    {
        "id": "meeting_notes",
        "name": "Meeting Notes",
        "description": "Generate meeting notes with decisions, risks, and next steps.",
        "prompt_file": "meeting_notes.md",
        "doc_type": "meeting_notes",
        "title_prefix": "Meeting Notes",
    },
    {
        "id": "clean_transcript",
        "name": "Clean Transcript",
        "description": "Clean grammar and formatting while preserving meaning.",
        "prompt_file": "clean_transcript.md",
        "doc_type": "clean_transcript",
        "title_prefix": "Clean Transcript",
    },
    {
        "id": "study_notes",
        "name": "Study Notes",
        "description": "Create study notes from lecture or learning content.",
        "prompt_file": "study_notes.md",
        "doc_type": "study_notes",
        "title_prefix": "Study Notes",
    },
]


class AiActionService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.llm_service = LlmService(self.settings)

    def list_templates(self) -> list[dict[str, str]]:
        return [
            {
                "id": template["id"],
                "name": template["name"],
                "description": template["description"],
            }
            for template in ACTION_TEMPLATES
        ]

    def _get_template(self, action: str) -> dict[str, str]:
        for template in ACTION_TEMPLATES:
            if template["id"] == action:
                return template
        if action == "custom":
            return {
                "id": "custom",
                "name": "Custom",
                "description": "Custom prompt",
                "prompt_file": "",
                "doc_type": "custom",
                "title_prefix": "Custom Document",
            }
        raise AppError("AI_ACTION_INVALID", f"Unknown action: {action}", 400)

    def _load_prompt(self, prompt_file: str, transcript_text: str, custom_prompt: str | None) -> str:
        if custom_prompt:
            return f"{custom_prompt}\n\nTranscript:\n\n{transcript_text}"

        path = PROMPTS_DIR / prompt_file
        if not path.exists():
            raise AppError("AI_ACTION_INVALID", f"Prompt template missing: {prompt_file}", 500)
        template = path.read_text(encoding="utf-8")
        return template.replace("{{TRANSCRIPT}}", transcript_text)

    def resolve_transcript_text(self, transcript: Transcript, source: str) -> str:
        if source == "editedText":
            if transcript.edited_text and transcript.edited_text.strip():
                return transcript.edited_text.strip()
            return transcript.raw_text.strip()
        return transcript.raw_text.strip()

    def run_action(
        self,
        transcript: Transcript,
        *,
        action: str,
        source: str,
        model: str | None = None,
        custom_prompt: str | None = None,
    ) -> tuple[str, str, str]:
        template = self._get_template(action)
        transcript_text = self.resolve_transcript_text(transcript, source)
        if not transcript_text:
            raise AppError("AI_ACTION_INVALID", "Transcript text is empty.", 400)

        prompt = self._load_prompt(template["prompt_file"], transcript_text, custom_prompt)
        messages = [{"role": "user", "content": prompt}]
        markdown = self.llm_service.chat_completion(messages, model=model)
        title = f"{template['title_prefix']}: {transcript.title}"
        return title, template["doc_type"], markdown
