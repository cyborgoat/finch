def test_llm_settings_defaults(client):
    response = client.get("/api/llm-settings")
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "openrouter"
    assert body["configured"] is False
    assert body["source"] == "unset"
    assert len(body["providers"]) == 4
    assert "apiKeyConfigured" in body


def test_llm_settings_update_provider_and_key(client):
    response = client.patch(
        "/api/llm-settings",
        json={
            "provider": "openai",
            "apiKey": "sk-test-openai",
            "defaultModel": "gpt-4.1-mini",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "openai"
    assert body["apiKeyConfigured"] is True
    assert body["source"] == "stored"
    assert body["configured"] is True
    assert body["defaultModel"] == "gpt-4.1-mini"

    get_response = client.get("/api/llm-settings")
    assert get_response.json()["provider"] == "openai"
    assert get_response.json()["apiKeyConfigured"] is True
    assert "sk-test" not in get_response.text


def test_llm_settings_base_url_override(client):
    response = client.patch(
        "/api/llm-settings",
        json={
            "provider": "openai",
            "apiKey": "sk-test-openai",
            "baseUrl": "https://my-proxy.example.com/v1",
            "defaultModel": "gpt-4.1-mini",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["baseUrl"] == "https://my-proxy.example.com/v1"
    assert body["configured"] is True

    get_response = client.get("/api/llm-settings")
    assert get_response.json()["baseUrl"] == "https://my-proxy.example.com/v1"


def test_llm_settings_custom_provider(client):
    response = client.patch(
        "/api/llm-settings",
        json={
            "provider": "custom",
            "baseUrl": "http://localhost:11434/v1",
            "defaultModel": "llama3.2",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "custom"
    assert body["baseUrl"] == "http://localhost:11434/v1"
    assert body["defaultModel"] == "llama3.2"
    assert body["configured"] is True


def test_llm_settings_rejects_invalid_provider(client):
    response = client.patch(
        "/api/llm-settings",
        json={"provider": "unknown-provider"},
    )
    assert response.status_code == 422


def test_health_reflects_stored_llm_settings(client):
    client.patch(
        "/api/llm-settings",
        json={
            "provider": "openai",
            "apiKey": "sk-test-openai",
        },
    )
    health = client.get("/api/health").json()
    assert health["capabilities"]["llmProvider"] == "openai"
    assert health["capabilities"]["llmConfigured"] is True
