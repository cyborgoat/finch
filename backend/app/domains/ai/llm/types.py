from dataclasses import dataclass, field
from enum import StrEnum
from typing import Literal, Protocol

LlmProviderId = Literal["openrouter", "openai", "anthropic", "custom"]


class LlmAdapterKind(StrEnum):
    OPENAI_COMPATIBLE = "openai_compatible"
    ANTHROPIC = "anthropic"


@dataclass(frozen=True)
class ChatMessage:
    role: str
    content: str


@dataclass(frozen=True)
class LlmConfig:
    provider: LlmProviderId
    adapter: LlmAdapterKind
    api_key: str
    base_url: str
    default_model: str
    timeout_seconds: float = 120.0
    anthropic_version: str = "2023-06-01"
    extra_headers: dict[str, str] = field(default_factory=dict)

    @property
    def provider_label(self) -> str:
        from app.domains.ai.llm.presets import get_preset

        return get_preset(self.provider).display_name


class LlmClient(Protocol):
    def chat(
        self,
        messages: list[dict[str, str]] | list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float = 0.2,
    ) -> str: ...
