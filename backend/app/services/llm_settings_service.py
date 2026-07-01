import json
from typing import Any

from sqlmodel import Session

from app.core.errors import AppError
from app.schemas.llm_settings import (
    LlmProviderInfo,
    LlmSettingsResponse,
    UpdateLlmSettingsRequest,
)
from app.services.app_preference_service import AppPreferenceService
from app.services.llm.config import resolve_llm_config
from app.services.llm.presets import ALLOWED_PROVIDERS, PRESETS, get_preset
from app.services.llm.runtime import DEFAULT_LLM_PROVIDER, LlmRuntimeSettings

LLM_SETTINGS_KEY = "llm_settings"


class LlmSettingsService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.preferences = AppPreferenceService(session)

    def get_settings(self) -> LlmSettingsResponse:
        stored = self._load_raw()
        runtime = self.get_runtime_settings()
        config = resolve_llm_config(runtime)
        provider = runtime.provider.strip().lower()  # type: ignore[union-attr]
        preset = get_preset(provider)  # type: ignore[arg-type]

        api_key_configured = bool(
            (runtime.api_key and runtime.api_key.strip()) or provider == "custom"
        )

        return LlmSettingsResponse(
            provider=provider,  # type: ignore[arg-type]
            provider_display_name=preset.display_name,
            api_key_configured=api_key_configured,
            base_url=(runtime.base_url or "").strip() or preset.default_base_url,
            default_model=(runtime.default_model or "").strip() or preset.default_model,
            configured=config is not None,
            source="stored" if stored else "unset",
            providers=self._list_providers(),
        )

    def update_settings(self, payload: UpdateLlmSettingsRequest) -> LlmSettingsResponse:
        current = self._load_raw()
        patch = payload.model_dump(exclude_unset=True)

        if "provider" in patch:
            provider = patch["provider"]
            if provider not in ALLOWED_PROVIDERS:
                allowed = ", ".join(ALLOWED_PROVIDERS)
                raise AppError(
                    "LLM_INVALID_PROVIDER",
                    f"Unknown provider: {provider}. Use one of: {allowed}.",
                    400,
                )
            current["provider"] = provider

        if "api_key" in patch:
            api_key = patch["api_key"]
            if api_key is not None:
                current["api_key"] = api_key.strip()

        if "base_url" in patch:
            base_url = patch["base_url"]
            current["base_url"] = base_url.strip() if base_url is not None else ""

        if "default_model" in patch:
            default_model = patch["default_model"]
            current["default_model"] = default_model.strip() if default_model is not None else ""

        self._save_raw(current)
        return self.get_settings()

    def get_runtime_settings(self) -> LlmRuntimeSettings:
        stored = self._load_raw()
        if not stored:
            return LlmRuntimeSettings()

        provider = stored.get("provider") or DEFAULT_LLM_PROVIDER
        api_key = stored.get("api_key") or None
        base_url = stored.get("base_url") or None
        default_model = stored.get("default_model") or None

        return LlmRuntimeSettings(
            provider=provider,
            api_key=api_key,
            base_url=base_url,
            default_model=default_model,
        )

    def _list_providers(self) -> list[LlmProviderInfo]:
        return [
            LlmProviderInfo(
                id=preset.provider,
                display_name=preset.display_name,
                default_base_url=preset.default_base_url,
                default_model=preset.default_model,
            )
            for preset in PRESETS.values()
        ]

    def _load_raw(self) -> dict[str, Any]:
        raw = self.preferences.get(LLM_SETTINGS_KEY)
        if not raw:
            return {}

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}

        return parsed if isinstance(parsed, dict) else {}

    def _save_raw(self, settings: dict[str, Any]) -> None:
        self.preferences.set(LLM_SETTINGS_KEY, json.dumps(settings))
