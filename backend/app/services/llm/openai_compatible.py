import httpx

from app.services.llm.errors import raise_llm_request_failed
from app.services.llm.types import ChatMessage, LlmConfig


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
        }
        headers = {
            "Content-Type": "application/json",
            **self.config.extra_headers,
        }
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"

        try:
            with httpx.Client(timeout=self.config.timeout_seconds) as client:
                response = client.post(
                    f"{self.config.base_url.rstrip('/')}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                body = response.json()
                return body["choices"][0]["message"]["content"].strip()
        except httpx.HTTPStatusError as exc:
            raise_llm_request_failed(self.config.provider_label, exc)
        except Exception as exc:
            raise_llm_request_failed(self.config.provider_label, exc)
