from datetime import UTC, datetime
from pathlib import Path

from sqlmodel import Session

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.domains.ai.action_presets import get_preset
from app.domains.ai.llm import build_llm_client, require_llm_config
from app.domains.ai.llm.runtime import LlmRuntimeSettings
from app.domains.ai.prompt_context import (
    apply_user_context,
    build_content_language_context,
    build_user_context,
)
from app.domains.recordings.transcript_text_service import resolve_transcript_text
from app.domains.settings.llm_settings_service import LlmSettingsService
from app.domains.settings.user_settings_service import UserSettingsService
from app.models.recording import Recording
from app.schemas.user_settings import UserSettingsResponse

PROMPTS_DIR = Path(__file__).resolve().parents[2] / "prompts"


class AiActionService:
    def __init__(self, session: Session | None, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.session = session

    def _runtime_settings(self):
        if self.session is None:
            raise AppError(
                "LLM_NOT_CONFIGURED",
                "LLM runtime settings require a database session.",
                500,
            )
        return LlmSettingsService(self.session).get_runtime_settings()

    def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.2,
        *,
        runtime: LlmRuntimeSettings | None = None,
    ) -> str:
        resolved_runtime = runtime or self._runtime_settings()
        client = build_llm_client(resolved_runtime)
        return client.chat(messages, model=model, temperature=temperature)

    def resolve_default_model(self, runtime: LlmRuntimeSettings | None = None) -> str:
        resolved_runtime = runtime or self._runtime_settings()
        return require_llm_config(resolved_runtime).default_model

    def _load_prompt(self, prompt_file: str, transcript_text: str) -> str:
        path = PROMPTS_DIR / prompt_file
        if not path.exists():
            raise AppError(
                "AI_ACTION_INVALID",
                f"Prompt template missing: {prompt_file}",
                500,
            )
        template = path.read_text(encoding="utf-8")
        return template.replace("{{TRANSCRIPT}}", transcript_text)

    def resolve_transcript_text(self, recording: Recording, source: str) -> str:
        return resolve_transcript_text(
            recording,
            source,
            self.session,
            self.settings,
        )

    def _compose_prompt(
        self,
        *,
        prompt_file: str,
        transcript_text: str,
        user_settings: UserSettingsResponse,
        uses_content_language: bool,
        uses_user_summary_prefs: bool,
    ) -> str:
        prompt = self._load_prompt(prompt_file, transcript_text)
        if uses_user_summary_prefs:
            context = build_user_context(user_settings)
            return apply_user_context(prompt, context)
        if uses_content_language:
            context = build_content_language_context(user_settings)
            return apply_user_context(prompt, context)
        return prompt

    def build_title(self, title_prefix: str, recording: Recording) -> str:
        return self._build_title(title_prefix, recording)

    def _build_title(self, title_prefix: str, recording: Recording) -> str:
        date_label = datetime.now(UTC).strftime("%b %d, %Y")
        return f"{title_prefix} · {date_label}"

    def run_action(
        self,
        recording: Recording,
        *,
        action: str,
        source: str,
        model: str | None = None,
        session: Session | None = None,
        user_settings: UserSettingsResponse | None = None,
    ) -> tuple[str, str, str]:
        resolved_action = action.strip()
        preset = get_preset(resolved_action)
        if preset is None:
            raise AppError(
                "AI_ACTION_INVALID",
                f"Unknown action: {action}.",
                400,
            )

        transcript_text = self.resolve_transcript_text(recording, source)
        if not transcript_text:
            raise AppError("AI_ACTION_INVALID", "Transcript text is empty.", 400)

        if user_settings is None:
            if session is None:
                user_settings = UserSettingsResponse()
            else:
                user_settings = UserSettingsService(session).get_settings()

        prompt = self._compose_prompt(
            prompt_file=preset.prompt_file,
            transcript_text=transcript_text,
            user_settings=user_settings,
            uses_content_language=preset.uses_content_language,
            uses_user_summary_prefs=preset.uses_user_summary_prefs,
        )
        messages = [{"role": "user", "content": prompt}]
        markdown = self.chat_completion(messages, model=model)
        title = self._build_title(preset.title_prefix, recording)
        return title, preset.note_type, markdown

    def run_action_from_text(
        self,
        *,
        action: str,
        transcript_text: str,
        model: str | None = None,
        runtime: LlmRuntimeSettings,
        user_settings: UserSettingsResponse,
        recording_id: str,
    ) -> tuple[str, str, str]:
        resolved_action = action.strip()
        preset = get_preset(resolved_action)
        if preset is None:
            raise AppError(
                "AI_ACTION_INVALID",
                f"Unknown action: {action}.",
                400,
            )

        if not transcript_text.strip():
            raise AppError("AI_ACTION_INVALID", "Transcript text is empty.", 400)

        prompt = self._compose_prompt(
            prompt_file=preset.prompt_file,
            transcript_text=transcript_text,
            user_settings=user_settings,
            uses_content_language=preset.uses_content_language,
            uses_user_summary_prefs=preset.uses_user_summary_prefs,
        )
        messages = [{"role": "user", "content": prompt}]
        markdown = self.chat_completion(messages, model=model, runtime=runtime)
        recording = Recording(id=recording_id)
        title = self._build_title(preset.title_prefix, recording)
        return title, preset.note_type, markdown
