import pytest

from app.core.errors import AppError
from app.services.llm.config import require_llm_config, resolve_llm_config
from app.services.llm.runtime import LlmRuntimeSettings


def test_resolve_openrouter_with_api_key():
    settings = LlmRuntimeSettings(
        provider="openrouter",
        api_key="sk-or-test",
        default_model="openai/gpt-4.1-mini",
    )
    config = resolve_llm_config(settings)
    assert config is not None
    assert config.provider == "openrouter"
    assert config.api_key == "sk-or-test"
    assert config.default_model == "openai/gpt-4.1-mini"


def test_resolve_openai_with_api_key():
    settings = LlmRuntimeSettings(
        provider="openai",
        api_key="sk-openai",
    )
    config = resolve_llm_config(settings)
    assert config is not None
    assert config.provider == "openai"
    assert config.base_url == "https://api.openai.com/v1"
    assert config.default_model == "gpt-4.1-mini"


def test_resolve_base_url_override():
    settings = LlmRuntimeSettings(
        provider="openai",
        api_key="sk-openai",
        base_url="https://my-proxy.example.com/v1",
    )
    config = resolve_llm_config(settings)
    assert config is not None
    assert config.base_url == "https://my-proxy.example.com/v1"


def test_resolve_custom_requires_base_url_and_model():
    settings = LlmRuntimeSettings(provider="custom")
    with pytest.raises(AppError) as exc_info:
        resolve_llm_config(settings)
    assert exc_info.value.code == "LLM_NOT_CONFIGURED"


def test_resolve_custom_with_local_config():
    settings = LlmRuntimeSettings(
        provider="custom",
        base_url="http://localhost:11434/v1",
        default_model="llama3.2",
    )
    config = resolve_llm_config(settings)
    assert config is not None
    assert config.api_key == ""
    assert config.base_url == "http://localhost:11434/v1"
    assert config.default_model == "llama3.2"


def test_invalid_provider_raises():
    settings = LlmRuntimeSettings(provider="unknown")
    with pytest.raises(AppError) as exc_info:
        resolve_llm_config(settings)
    assert exc_info.value.code == "LLM_INVALID_PROVIDER"


def test_require_llm_config_raises_when_missing_key():
    settings = LlmRuntimeSettings(provider="openai", api_key=None)
    with pytest.raises(AppError) as exc_info:
        require_llm_config(settings)
    assert exc_info.value.code == "LLM_NOT_CONFIGURED"
