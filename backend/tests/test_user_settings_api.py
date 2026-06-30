def test_user_settings_defaults(client):
    response = client.get("/api/user-settings")
    assert response.status_code == 200
    body = response.json()
    assert body["language"] == "en"
    assert body["summaryStyle"] == "balanced"
    assert body["summaryFormat"] == "paragraphs"
    assert body["userName"] == ""
    assert body["userSpeakerProfileId"] is None


def test_user_settings_update_and_partial_patch(client):
    update = client.patch(
        "/api/user-settings",
        json={
            "language": "zh",
            "summaryStyle": "concise",
            "summaryFormat": "bullets",
            "userName": "Alex",
        },
    )
    assert update.status_code == 200
    body = update.json()
    assert body["language"] == "zh"
    assert body["summaryStyle"] == "concise"
    assert body["summaryFormat"] == "bullets"
    assert body["userName"] == "Alex"

    patch = client.patch(
        "/api/user-settings",
        json={"summaryStyle": "detailed", "userName": "  Jordan  "},
    )
    assert patch.status_code == 200
    body = patch.json()
    assert body["language"] == "zh"
    assert body["summaryStyle"] == "detailed"
    assert body["userName"] == "Jordan"


def test_user_settings_links_speaker_profile(client):
    create = client.post(
        "/api/speaker-profiles",
        json={"displayName": "Alex"},
    )
    profile_id = create.json()["id"]

    linked = client.patch(
        "/api/user-settings",
        json={"userSpeakerProfileId": profile_id},
    )
    assert linked.status_code == 200
    assert linked.json()["userSpeakerProfileId"] == profile_id

    deleted = client.delete(f"/api/speaker-profiles/{profile_id}")
    assert deleted.status_code == 200

    settings = client.get("/api/user-settings")
    assert settings.json()["userSpeakerProfileId"] is None


def test_user_settings_rejects_unknown_speaker(client):
    response = client.patch(
        "/api/user-settings",
        json={"userSpeakerProfileId": "profile_missing"},
    )
    assert response.status_code == 404
