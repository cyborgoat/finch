from dataclasses import dataclass

DEFAULT_LLM_PROVIDER = "openrouter"
DEFAULT_LLM_REQUEST_TIMEOUT_SECONDS = 120.0
DEFAULT_ANTHROPIC_VERSION = "2023-06-01"


@dataclass(frozen=True)
class LlmRuntimeSettings:
    provider: str = DEFAULT_LLM_PROVIDER
    api_key: str | None = None
    base_url: str | None = None
    default_model: str | None = None
    request_timeout_seconds: float = DEFAULT_LLM_REQUEST_TIMEOUT_SECONDS
    anthropic_version: str = DEFAULT_ANTHROPIC_VERSION
