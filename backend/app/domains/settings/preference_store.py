import json
from collections.abc import Callable
from typing import Any

from sqlmodel import Session

from app.domains.settings.app_preference_service import AppPreferenceService


class JsonPreferenceStore:
    def __init__(self, session: Session) -> None:
        self.preferences = AppPreferenceService(session)

    def load(
        self,
        key: str,
        *,
        default: dict[str, Any] | None = None,
        merge_default: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        raw = self.preferences.get(key)
        if not raw:
            return dict(default or {})

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return dict(default or {})

        if not isinstance(parsed, dict):
            return dict(default or {})

        if merge_default is not None:
            return merge_default(parsed)

        return parsed

    def save(self, key: str, data: dict[str, Any]) -> None:
        self.preferences.set(key, json.dumps(data))

    def merge(self, key: str, patch: dict[str, Any]) -> dict[str, Any]:
        current = self.load(key)
        current.update(patch)
        self.save(key, current)
        return current
