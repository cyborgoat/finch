from unittest.mock import MagicMock

from app.domains.settings.preference_store import JsonPreferenceStore


def test_load_returns_default_when_missing():
    session = MagicMock()
    store = JsonPreferenceStore(session)
    store.preferences.get = MagicMock(return_value=None)

    assert store.load("missing_key", default={"enabled": False}) == {"enabled": False}


def test_load_parses_json():
    session = MagicMock()
    store = JsonPreferenceStore(session)
    store.preferences.get = MagicMock(return_value='{"enabled": true}')

    assert store.load("settings") == {"enabled": True}


def test_merge_updates_and_saves():
    session = MagicMock()
    store = JsonPreferenceStore(session)
    store.preferences.get = MagicMock(return_value='{"enabled": false}')
    saved: dict[str, str] = {}
    store.preferences.set = MagicMock(side_effect=lambda key, value: saved.update({key: value}))

    result = store.merge("settings", {"enabled": True, "mode": "auto"})

    assert result == {"enabled": True, "mode": "auto"}
    assert saved["settings"] == '{"enabled": true, "mode": "auto"}'
