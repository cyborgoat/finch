from datetime import UTC, datetime

from app.models.audio_asset import AudioAsset
from app.models.transcript import Transcript
from app.services.diarization_service import SpeakerSegment, speaker_segments_to_json


def _seed_transcript(db_session, client):
    now = datetime.now(UTC)
    db_session.add(
        AudioAsset(
            id="audio_speaker",
            source="upload",
            filename="meeting.wav",
            mime_type="audio/wav",
            size_bytes=100,
            original_path="/tmp/meeting.wav",
            normalized_path="/tmp/meeting.wav",
            created_at=now,
        )
    )
    segments = [
        SpeakerSegment(
            speaker="Speaker 1",
            start_sec=0.0,
            end_sec=2.0,
            text="Hello",
            cluster_id="SPEAKER_00",
        ),
        SpeakerSegment(
            speaker="Speaker 2",
            start_sec=2.0,
            end_sec=4.0,
            text="Hi",
            cluster_id="SPEAKER_01",
        ),
    ]
    db_session.add(
        Transcript(
            id="a0a0a0a0a0a0a0a0",
            audio_asset_id="audio_speaker",
            title="Meeting",
            raw_text="Speaker 1: Hello\n\nSpeaker 2: Hi",
            speaker_segments=speaker_segments_to_json(segments),
            status="draft",
            created_at=now,
            updated_at=now,
        )
    )
    db_session.commit()


def test_speaker_memory_consent_and_profiles(client, db_session):
    status = client.get("/api/speaker-memory/status")
    assert status.status_code == 200
    assert status.json()["consentGiven"] is False

    consent = client.post("/api/speaker-memory/consent")
    assert consent.status_code == 200
    assert consent.json()["consentAt"]

    toggle = client.patch("/api/speaker-memory/status", json={"enabled": True})
    assert toggle.status_code == 200
    assert toggle.json()["enabled"] is True

    create = client.post(
        "/api/speaker-profiles",
        json={"displayName": "Robert", "notes": "Team lead"},
    )
    assert create.status_code == 200
    profile_id = create.json()["id"]

    listing = client.get("/api/speaker-profiles")
    assert listing.status_code == 200
    assert len(listing.json()["items"]) == 1

    update = client.patch(
        f"/api/speaker-profiles/{profile_id}",
        json={"displayName": "Robert Smith"},
    )
    assert update.status_code == 200
    assert update.json()["displayName"] == "Robert Smith"


def test_update_transcript_speakers(client, db_session):
    _seed_transcript(db_session, client)

    response = client.patch(
        "/api/transcripts/a0a0a0a0a0a0a0a0/speakers",
        json={
            "mappings": [
                {"clusterId": "SPEAKER_00", "displayName": "Robert", "enroll": False},
                {"clusterId": "SPEAKER_01", "displayName": "David", "enroll": False},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["rawText"].startswith("Robert: Hello")
    assert any(segment["speaker"] == "David" for segment in body["speakerSegments"])

    transcript = client.get("/api/transcripts/a0a0a0a0a0a0a0a0")
    assert transcript.status_code == 200
    assert "Robert: Hello" in transcript.json()["rawText"]


def test_get_speaker_profile_detail(client, db_session):
    create = client.post(
        "/api/speaker-profiles",
        json={"displayName": "Robert", "notes": "Host"},
    )
    profile_id = create.json()["id"]

    detail = client.get(f"/api/speaker-profiles/{profile_id}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["displayName"] == "Robert"
    assert "embeddingDescription" in body
    assert body["embeddings"] == []
    assert body["relatedTranscripts"] == []


def test_health_includes_speaker_memory_flags(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    capabilities = response.json()["capabilities"]
    assert "speakerMemoryEnabled" in capabilities
    assert "speakerMemoryConsentGiven" in capabilities
