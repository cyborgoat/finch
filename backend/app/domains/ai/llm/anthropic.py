import httpx

from app.core.errors import AppError
from app.domains.ai.llm.errors import raise_llm_request_failed
from app.domains.ai.llm.types import ChatMessage, LlmConfig


class AnthropicMessagesClient:
    def __init__(self, config: LlmConfig) -> None:
        self.config = config

    def _to_anthropic_messages(
        self,
        messages: list[dict[str, str]] | list[ChatMessage],
    ) -> tuple[str | None, list[dict[str, str]]]:
        system_parts: list[str] = []
        anthropic_messages: list[dict[str, str]] = []

        for message in messages:
            role = message["role"] if isinstance(message, dict) else message.role
            content = message["content"] if isinstance(message, dict) else message.content

            if role == "system":
                system_parts.append(content)
            elif role in {"user", "assistant"}:
                anthropic_messages.append({"role": role, "content": content})
            else:
                anthropic_messages.append({"role": "user", "content": content})

        system = "\n\n".join(part.strip() for part in system_parts if part.strip()) or None
        return system, anthropic_messages

    def chat(
        self,
        messages: list[dict[str, str]] | list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        system, anthropic_messages = self._to_anthropic_messages(messages)
        payload: dict[str, object] = {
            "model": model or self.config.default_model,
            "max_tokens": 4096,
            "temperature": temperature,
            "messages": anthropic_messages,
        }
        if system:
            payload["system"] = system

        headers = {
            "x-api-key": self.config.api_key,
            "anthropic-version": self.config.anthropic_version,
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.config.timeout_seconds) as client:
                response = client.post(
                    f"{self.config.base_url.rstrip('/')}/v1/messages",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                body = response.json()
                content_blocks = body.get("content") or []
                text_parts = [
                    block.get("text", "")
                    for block in content_blocks
                    if isinstance(block, dict) and block.get("type") == "text"
                ]
                text = "".join(text_parts).strip()
                if not text:
                    raise AppError(
                        "LLM_REQUEST_FAILED",
                        "Anthropic returned an empty response.",
                        502,
                    )
                return text
        except AppError:
            raise
        except httpx.HTTPStatusError as exc:
            raise_llm_request_failed(self.config.provider_label, exc)
        except Exception as exc:
            raise_llm_request_failed(self.config.provider_label, exc)
