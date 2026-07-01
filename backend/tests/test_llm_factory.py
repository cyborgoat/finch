from app.services.llm.anthropic import AnthropicMessagesClient
from app.services.llm.config import resolve_llm_config
from app.services.llm.factory import build_llm_client, build_llm_client_from_config
from app.services.llm.openai_compatible import OpenAiCompatibleClient
from app.services.llm.runtime import LlmRuntimeSettings


def test_build_openrouter_client():
    settings = LlmRuntimeSettings(
        provider="openrouter",
        api_key="sk-or-test",
    )
    client = build_llm_client(settings)
    assert isinstance(client, OpenAiCompatibleClient)


def test_build_anthropic_client():
    settings = LlmRuntimeSettings(
        provider="anthropic",
        api_key="sk-ant-test",
    )
    client = build_llm_client(settings)
    assert isinstance(client, AnthropicMessagesClient)


def test_build_client_from_config():
    settings = LlmRuntimeSettings(
        provider="openai",
        api_key="sk-openai",
    )
    config = resolve_llm_config(settings)
    assert config is not None
    client = build_llm_client_from_config(config)
    assert isinstance(client, OpenAiCompatibleClient)
