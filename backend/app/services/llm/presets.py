from dataclasses import dataclass

from app.services.llm.types import LlmAdapterKind, LlmProviderId

ALLOWED_PROVIDERS: tuple[LlmProviderId, ...] = (
    "openrouter",
    "openai",
    "anthropic",
    "custom",
)


@dataclass(frozen=True)
class LlmProviderPreset:
    provider: LlmProviderId
    adapter: LlmAdapterKind
    default_base_url: str
    default_model: str
    display_name: str


PRESETS: dict[LlmProviderId, LlmProviderPreset] = {
    "openrouter": LlmProviderPreset(
        provider="openrouter",
        adapter=LlmAdapterKind.OPENAI_COMPATIBLE,
        default_base_url="https://openrouter.ai/api/v1",
        default_model="openai/gpt-4.1-mini",
        display_name="OpenRouter",
    ),
    "openai": LlmProviderPreset(
        provider="openai",
        adapter=LlmAdapterKind.OPENAI_COMPATIBLE,
        default_base_url="https://api.openai.com/v1",
        default_model="gpt-4.1-mini",
        display_name="OpenAI",
    ),
    "anthropic": LlmProviderPreset(
        provider="anthropic",
        adapter=LlmAdapterKind.ANTHROPIC,
        default_base_url="https://api.anthropic.com",
        default_model="claude-sonnet-4-20250514",
        display_name="Anthropic",
    ),
    "custom": LlmProviderPreset(
        provider="custom",
        adapter=LlmAdapterKind.OPENAI_COMPATIBLE,
        default_base_url="",
        default_model="",
        display_name="Custom (OpenAI-compatible)",
    ),
}


def get_preset(provider: LlmProviderId) -> LlmProviderPreset:
    return PRESETS[provider]
