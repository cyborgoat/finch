from app.core.errors import AppError
from app.services.llm.presets import ALLOWED_PROVIDERS, get_preset
from app.services.llm.runtime import LlmRuntimeSettings
from app.services.llm.types import LlmConfig, LlmProviderId


def _resolve_provider(settings: LlmRuntimeSettings) -> LlmProviderId:
    provider = (settings.provider or "openrouter").strip().lower()
    if provider not in ALLOWED_PROVIDERS:
        allowed = ", ".join(ALLOWED_PROVIDERS)
        raise AppError(
            "LLM_INVALID_PROVIDER",
            f"Unknown LLM provider: {provider}. Use one of: {allowed}.",
            400,
        )
    return provider  # type: ignore[return-value]


def _resolve_api_key(settings: LlmRuntimeSettings, provider: LlmProviderId) -> str:
    if settings.api_key and settings.api_key.strip():
        return settings.api_key.strip()
    if provider == "custom":
        return ""
    return ""


def _resolve_base_url(settings: LlmRuntimeSettings, provider: LlmProviderId) -> str:
    preset = get_preset(provider)
    if settings.base_url and settings.base_url.strip():
        return settings.base_url.strip().rstrip("/")
    if provider == "custom":
        raise AppError(
            "LLM_NOT_CONFIGURED",
            "Base URL is required for the custom provider.",
            400,
        )
    return preset.default_base_url.rstrip("/")


def _resolve_default_model(settings: LlmRuntimeSettings, provider: LlmProviderId) -> str:
    preset = get_preset(provider)
    if settings.default_model and settings.default_model.strip():
        return settings.default_model.strip()
    if provider == "custom":
        raise AppError(
            "LLM_NOT_CONFIGURED",
            "Default model is required for the custom provider.",
            400,
        )
    return preset.default_model


def resolve_llm_config(settings: LlmRuntimeSettings) -> LlmConfig | None:
    """Return resolved LLM config, or None when not configured (no API key)."""
    provider = _resolve_provider(settings)
    api_key = _resolve_api_key(settings, provider)

    if not api_key and provider != "custom":
        return None

    base_url = _resolve_base_url(settings, provider)
    default_model = _resolve_default_model(settings, provider)
    preset = get_preset(provider)

    return LlmConfig(
        provider=provider,
        adapter=preset.adapter,
        api_key=api_key,
        base_url=base_url,
        default_model=default_model,
        timeout_seconds=settings.request_timeout_seconds,
        anthropic_version=settings.anthropic_version,
    )


def require_llm_config(settings: LlmRuntimeSettings) -> LlmConfig:
    config = resolve_llm_config(settings)
    if config is None:
        provider = _resolve_provider(settings)
        if provider == "custom":
            message = "Configure base URL and default model in Settings."
        else:
            message = "Configure an API key in Settings."
        raise AppError("LLM_NOT_CONFIGURED", message, 400)
    return config
