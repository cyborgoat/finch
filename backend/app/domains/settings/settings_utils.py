from collections.abc import Callable
from typing import Any

from sqlmodel import Session

from app.domains.settings.preference_store import JsonPreferenceStore


class JsonSettingsRepository:
    def __init__(
        self,
        session: Session,
        key: str,
        *,
        default: dict[str, Any] | None = None,
        merge_default: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> None:
        self.session = session
        self.store = JsonPreferenceStore(session)
        self.key = key
        self.default = default
        self.merge_default = merge_default

    def load(self) -> dict[str, Any]:
        return self.store.load(
            self.key,
            default=self.default,
            merge_default=self.merge_default,
        )

    def save(self, data: dict[str, Any]) -> None:
        self.store.save(self.key, data)

    def update(
        self,
        mutator: Callable[[dict[str, Any]], dict[str, Any]],
    ) -> dict[str, Any]:
        current = self.load()
        updated = mutator(current)
        self.save(updated)
        return updated
