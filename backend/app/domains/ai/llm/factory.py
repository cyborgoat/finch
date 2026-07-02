from app.domains.ai.llm.anthropic import AnthropicMessagesClient
from app.domains.ai.llm.config import require_llm_config
from app.domains.ai.llm.openai_compatible import OpenAiCompatibleClient
from app.domains.ai.llm.runtime import LlmRuntimeSettings
from app.domains.ai.llm.types import LlmAdapterKind, LlmClient, LlmConfig


def build_llm_client_from_config(config: LlmConfig) -> LlmClient:
    if config.adapter == LlmAdapterKind.ANTHROPIC:
        return AnthropicMessagesClient(config)
    return OpenAiCompatibleClient(config)


def build_llm_client(settings: LlmRuntimeSettings) -> LlmClient:
    config = require_llm_config(settings)
    return build_llm_client_from_config(config)
