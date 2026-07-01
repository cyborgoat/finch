from sqlmodel import Session

from app.core.errors import AppError
from app.services.llm import build_llm_client, require_llm_config
from app.services.llm_settings_service import LlmSettingsService


class LlmService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def _runtime_settings(self):
        return LlmSettingsService(self.session).get_runtime_settings()

    def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        runtime = self._runtime_settings()
        client = build_llm_client(runtime)
        return client.chat(messages, model=model, temperature=temperature)

    def resolve_default_model(self) -> str:
        runtime = self._runtime_settings()
        return require_llm_config(runtime).default_model
