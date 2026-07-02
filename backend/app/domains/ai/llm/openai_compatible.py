import logging

import httpx

from app.domains.ai.llm.errors import raise_llm_request_failed
from app.domains.ai.llm.types import ChatMessage, LlmConfig

logger = logging.getLogger(__name__)


def _extract_message_content(message: object) -> str:
    if not isinstance(message, dict):
        return ""

    content = message.get("content")
    if isinstance(content, str):
        stripped = content.strip()
        if stripped:
            return stripped
    elif isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
            elif isinstance(item, str) and item.strip():
                parts.append(item.strip())
        return "\n".join(parts).strip()

    for key in ("reasoning", "reasoning_content"):
        value = message.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return ""


class OpenAiCompatibleClient:
    def __init__(self, config: LlmConfig) -> None:
        self.config = config

    def chat(
        self,
        messages: list[dict[str, str]] | list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        payload = {
            "model": model or self.config.default_model,
            "messages": [
                {"role": m["role"], "content": m["content"]}
                if isinstance(m, dict)
                else {"role": m.role, "content": m.content}
                for m in messages
            ],
            "temperature": temperature,
            "stream": False,
        }
        headers = {
            "Content-Type": "application/json",
            **self.config.extra_headers,
        }
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"

        timeout = httpx.Timeout(
            connect=10.0,
            read=self.config.timeout_seconds,
            write=10.0,
            pool=10.0,
        )

        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(
                    f"{self.config.base_url.rstrip('/')}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                logger.info(
                    "LLM HTTP response received (status=%s, model=%s)",
                    response.status_code,
                    payload["model"],
                )
                body = response.json()
                choices = body.get("choices")
                if not isinstance(choices, list) or not choices:
                    raise ValueError("LLM response missing choices")
                message = choices[0].get("message")
                content = _extract_message_content(message)
                if not content:
                    raise ValueError("LLM response did not include message content")
                logger.info(
                    "LLM response received (%d chars, model=%s)",
                    len(content),
                    payload["model"],
                )
                return content
        except httpx.HTTPStatusError as exc:
            raise_llm_request_failed(self.config.provider_label, exc)
        except Exception as exc:
            raise_llm_request_failed(self.config.provider_label, exc)
