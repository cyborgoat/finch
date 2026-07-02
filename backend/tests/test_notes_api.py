
from tests.support.api_helpers import (
    configure_llm,
    create_meeting_summary,
    create_recording,
)


def test_list_notes_filters_by_recording_id(client, sample_wav_bytes):
    configure_llm(client)

    recording_a = create_recording(client, sample_wav_bytes)
    recording_b = create_recording(client, sample_wav_bytes)

    note_a = create_meeting_summary(client, recording_a)
    note_b = create_meeting_summary(client, recording_b)
    assert note_a != note_b

    filtered_a = client.get(f"/api/notes?recordingId={recording_a}").json()
    assert len(filtered_a["items"]) == 1
    assert filtered_a["items"][0]["id"] == note_a
    assert filtered_a["items"][0]["recordingId"] == recording_a

    filtered_b = client.get(f"/api/notes?recordingId={recording_b}").json()
    assert len(filtered_b["items"]) == 1
    assert filtered_b["items"][0]["id"] == note_b
    assert filtered_b["items"][0]["recordingId"] == recording_b

    all_docs = client.get("/api/notes").json()
    assert len(all_docs["items"]) == 2


def test_create_manual_note_and_delete_one_of_many(client, sample_wav_bytes):
    recording_id = create_recording(client, sample_wav_bytes)

    create_a = client.post(
        "/api/notes",
        json={"recordingId": recording_id, "title": "My note", "markdown": "# Hello"},
    )
    assert create_a.status_code == 200
    note_a = create_a.json()["id"]
    assert create_a.json()["type"] == "note"
    assert create_a.json()["model"] == "manual"

    create_b = client.post(
        "/api/notes",
        json={"recordingId": recording_id},
    )
    assert create_b.status_code == 200
    note_b = create_b.json()["id"]
    assert create_b.json()["status"] == "ready"
    assert note_b != note_a

    listed = client.get(f"/api/notes?recordingId={recording_id}").json()
    assert len(listed["items"]) == 2

    delete_response = client.delete(f"/api/notes/{note_a}")
    assert delete_response.status_code == 200

    remaining = client.get(f"/api/notes?recordingId={recording_id}").json()
    assert len(remaining["items"]) == 1
    assert remaining["items"][0]["id"] == note_b


def test_list_ai_action_templates(client):
    response = client.get("/api/ai-actions/templates")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 4
    ids = {item["id"] for item in items}
    assert ids == {"meeting_summary", "action_items", "key_decisions", "follow_up_email"}
