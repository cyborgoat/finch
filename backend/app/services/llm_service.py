import httpx

from app.config import Settings, get_settings
from app.core.errors import AppError

MOCK_MARKDOWN = """# Mock Summary

## Overview

This is a mock AI-generated summary from Finch.

## Action Items

- [ ] Replace mock LLM with OpenRouter integration.
"""


class LlmService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        if self.settings.llm_mock:
            return MOCK_MARKDOWN

        if not self.settings.openrouter_api_key:
            raise AppError(
                "LLM_NOT_CONFIGURED",
                "OPENROUTER_API_KEY is not configured.",
                400,
            )

        payload = {
            "model": model or self.settings.openrouter_default_model,
            "messages": messages,
            "temperature": temperature,
        }
        headers = {
            "Authorization": f"Bearer {self.settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=120.0) as client:
                response = client.post(
                    f"{self.settings.openrouter_base_url.rstrip('/')}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                body = response.json()
                return body["choices"][0]["message"]["content"].strip()
        except httpx.HTTPStatusError as exc:
            raise AppError(
                "LLM_REQUEST_FAILED",
                f"OpenRouter request failed: {exc.response.text}",
                502,
            ) from exc
        except Exception as exc:
            raise AppError(
                "LLM_REQUEST_FAILED",
                f"OpenRouter request failed: {exc}",
                502,
            ) from exc
