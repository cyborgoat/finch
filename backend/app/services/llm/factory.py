from app.services.llm.anthropic import AnthropicMessagesClient
from app.services.llm.config import require_llm_config
from app.services.llm.openai_compatible import OpenAiCompatibleClient
from app.services.llm.runtime import LlmRuntimeSettings
from app.services.llm.types import LlmAdapterKind, LlmClient, LlmConfig


def build_llm_client_from_config(config: LlmConfig) -> LlmClient:
    if config.adapter == LlmAdapterKind.ANTHROPIC:
        return AnthropicMessagesClient(config)
    return OpenAiCompatibleClient(config)


def build_llm_client(settings: LlmRuntimeSettings) -> LlmClient:
    config = require_llm_config(settings)
    return build_llm_client_from_config(config)
