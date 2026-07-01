from pathlib import Path

from sqlmodel import Session

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.models.transcript import Transcript
from app.schemas.user_settings import UserSettingsResponse
from app.services.llm_service import LlmService
from app.services.prompt_context import apply_user_context, build_user_context
from app.services.user_settings_service import UserSettingsService

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

SUMMARY_ACTION = "markdown_summary"
SUMMARY_PROMPT_FILE = "summarize_markdown.md"
SUMMARY_DOC_TYPE = "markdown_summary"
SUMMARY_TITLE_PREFIX = "Summary"


class AiActionService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.session = session
        self.llm_service = LlmService(session)

    def _load_prompt(self, transcript_text: str) -> str:
        path = PROMPTS_DIR / SUMMARY_PROMPT_FILE
        if not path.exists():
            raise AppError(
                "AI_ACTION_INVALID",
                f"Prompt template missing: {SUMMARY_PROMPT_FILE}",
                500,
            )
        template = path.read_text(encoding="utf-8")
        return template.replace("{{TRANSCRIPT}}", transcript_text)

    def resolve_transcript_text(self, transcript: Transcript, source: str) -> str:
        if source == "editedText":
            if transcript.edited_text and transcript.edited_text.strip():
                return transcript.edited_text.strip()
            return transcript.raw_text.strip()
        return transcript.raw_text.strip()

    def _compose_prompt(
        self,
        *,
        transcript_text: str,
        user_settings: UserSettingsResponse,
    ) -> str:
        prompt = self._load_prompt(transcript_text)
        context = build_user_context(user_settings)
        return apply_user_context(prompt, context)

    def run_summary(
        self,
        transcript: Transcript,
        *,
        source: str = "editedText",
        model: str | None = None,
        session: Session | None = None,
        user_settings: UserSettingsResponse | None = None,
    ) -> tuple[str, str, str]:
        transcript_text = self.resolve_transcript_text(transcript, source)
        if not transcript_text:
            raise AppError("AI_ACTION_INVALID", "Transcript text is empty.", 400)

        if user_settings is None:
            if session is None:
                user_settings = UserSettingsResponse()
            else:
                user_settings = UserSettingsService(session).get_settings()

        prompt = self._compose_prompt(
            transcript_text=transcript_text,
            user_settings=user_settings,
        )
        messages = [{"role": "user", "content": prompt}]
        markdown = self.llm_service.chat_completion(messages, model=model)
        title = f"{SUMMARY_TITLE_PREFIX}: {transcript.title}"
        return title, SUMMARY_DOC_TYPE, markdown

    def run_action(
        self,
        transcript: Transcript,
        *,
        action: str,
        source: str,
        model: str | None = None,
        session: Session | None = None,
        user_settings: UserSettingsResponse | None = None,
    ) -> tuple[str, str, str]:
        if action != SUMMARY_ACTION:
            raise AppError(
                "AI_ACTION_INVALID",
                f"Unknown action: {action}. Only {SUMMARY_ACTION} is supported.",
                400,
            )
        return self.run_summary(
            transcript,
            source=source,
            model=model,
            session=session,
            user_settings=user_settings,
        )
