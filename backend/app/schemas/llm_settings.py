from typing import Literal

from app.schemas import CamelModel

LlmProviderOption = Literal["openrouter", "openai", "anthropic", "custom"]
LlmSettingsSource = Literal["stored", "unset"]


class LlmProviderInfo(CamelModel):
    id: LlmProviderOption
    display_name: str
    default_base_url: str
    default_model: str


class LlmSettingsResponse(CamelModel):
    provider: LlmProviderOption
    provider_display_name: str
    api_key_configured: bool
    base_url: str
    default_model: str
    configured: bool
    source: LlmSettingsSource
    providers: list[LlmProviderInfo]


class UpdateLlmSettingsRequest(CamelModel):
    provider: LlmProviderOption | None = None
    api_key: str | None = None
    base_url: str | None = None
    default_model: str | None = None
