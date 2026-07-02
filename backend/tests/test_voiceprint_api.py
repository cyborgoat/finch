from datetime import UTC, datetime
from io import BytesIO
from unittest.mock import patch

import numpy as np

from app.domains.transcription.diarization_service import SpeakerSegment, speaker_segments_to_json
from app.models.audio_asset import AudioAsset
from app.models.recording import Recording


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
        Recording(
            id="recording_speaker",
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


def test_voiceprint_profiles_consent_and_list(client, db_session):
    status = client.get("/api/voiceprint-profiles/status")
    assert status.status_code == 200
    assert status.json()["consentGiven"] is False

    consent = client.post("/api/voiceprint-profiles/consent")
    assert consent.status_code == 200
    assert consent.json()["consentAt"]

    toggle = client.patch("/api/voiceprint-profiles/status", json={"enabled": True})
    assert toggle.status_code == 200
    assert toggle.json()["enabled"] is True

    create = client.post(
        "/api/voiceprint-profiles",
        json={"displayName": "Robert", "notes": "Team lead"},
    )
    assert create.status_code == 200
    profile_id = create.json()["id"]

    listing = client.get("/api/voiceprint-profiles")
    assert listing.status_code == 200
    assert len(listing.json()["items"]) == 1

    update = client.patch(
        f"/api/voiceprint-profiles/{profile_id}",
        json={"displayName": "Robert Smith"},
    )
    assert update.status_code == 200
    assert update.json()["displayName"] == "Robert Smith"


def test_update_recording_speakers(client, db_session):
    _seed_transcript(db_session, client)

    response = client.patch(
        "/api/recordings/recording_speaker/speakers",
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

    transcript = client.get("/api/recordings/recording_speaker")
    assert transcript.status_code == 200
    assert "Robert: Hello" in transcript.json()["rawText"]


def test_update_recording_speakers_clears_profile_link_for_new_name(client, db_session):
    _seed_transcript(db_session, client)

    client.post("/api/voiceprint-profiles", json={"displayName": "Robert"})
    profile_id = client.get("/api/voiceprint-profiles").json()["items"][0]["id"]

    linked = client.patch(
        "/api/recordings/recording_speaker/speakers",
        json={
            "mappings": [
                {
                    "clusterId": "SPEAKER_00",
                    "displayName": "Robert",
                    "profileId": profile_id,
                    "enroll": False,
                }
            ]
        },
    )
    assert linked.status_code == 200
    assert linked.json()["speakerSegments"][0]["voiceprintProfileId"] == profile_id

    renamed = client.patch(
        "/api/recordings/recording_speaker/speakers",
        json={
            "mappings": [
                {
                    "clusterId": "SPEAKER_00",
                    "displayName": "Alice",
                    "profileId": None,
                    "enroll": False,
                }
            ]
        },
    )
    assert renamed.status_code == 200
    segment = renamed.json()["speakerSegments"][0]
    assert segment["speaker"] == "Alice"
    assert segment["voiceprintProfileId"] is None


def test_update_recording_speakers_enroll_without_auto_label(
    client, db_session, monkeypatch
):
    from app.domains.voiceprint.profile_service import VoiceprintProfile

    _seed_transcript(db_session, client)
    client.post("/api/voiceprint-profiles/consent")
    client.patch(
        "/api/transcription-settings",
        json={"voiceprintProfilesEnabled": True},
    )

    created_profile = VoiceprintProfile(id="profile_enroll", display_name="Robert")
    monkeypatch.setattr(
        "app.domains.recordings.speaker_service.VoiceprintProfileService.enroll_from_transcript",
        lambda self, **kwargs: created_profile,
    )

    response = client.patch(
        "/api/recordings/recording_speaker/speakers",
        json={
            "mappings": [
                {
                    "clusterId": "SPEAKER_00",
                    "displayName": "Robert",
                    "enroll": True,
                    "enrollStartSec": 0.0,
                    "enrollEndSec": 2.0,
                }
            ]
        },
    )
    assert response.status_code == 200
    assert response.json()["speakerSegments"][0]["voiceprintProfileId"] == "profile_enroll"


def test_transcription_settings_stored_in_preferences(client, db_session):
    initial = client.get("/api/transcription-settings")
    assert initial.status_code == 200
    assert initial.json()["diarizationEnabled"] is False
    assert initial.json()["voiceprintProfilesEnabled"] is False

    updated = client.patch(
        "/api/transcription-settings",
        json={
            "diarizationEnabled": True,
            "voiceprintProfilesEnabled": True,
        },
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["diarizationEnabled"] is True
    assert body["voiceprintProfilesEnabled"] is True
    assert body["source"] == "stored"


def test_enroll_voiceprint_profile_from_audio_sample(client, db_session, sample_wav_bytes):
    from app.domains.settings.app_preference_service import AppPreferenceService
    from app.domains.voiceprint.embedding_service import VoiceprintEmbeddingService

    AppPreferenceService(db_session).record_voiceprint_profiles_consent()
    client.patch(
        "/api/transcription-settings",
        json={"voiceprintProfilesEnabled": True},
    )

    with patch("app.domains.media.audio_service.subprocess.run") as mock_run:
        from tests.support.fakes import fake_ffmpeg_run

        mock_run.side_effect = fake_ffmpeg_run(sample_wav_bytes)
        upload = client.post(
            "/api/audio/upload",
            data={"source": "recording"},
            files={"file": ("sample.wav", BytesIO(sample_wav_bytes), "audio/wav")},
        )
    audio_id = upload.json()["id"]
    asset = db_session.get(AudioAsset, audio_id)
    asset.duration_seconds = 3.0
    db_session.add(asset)
    db_session.commit()

    vector = np.array([1.0, 0.0, 0.0], dtype=np.float32)

    with patch.object(
        VoiceprintEmbeddingService,
        "extract_embedding",
        return_value=vector / np.linalg.norm(vector),
    ):
        response = client.post(
            "/api/voiceprint-profiles/enroll-sample",
            json={
                "audioAssetId": audio_id,
                "displayName": "Alex",
                "setAsUserProfile": True,
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["profile"]["displayName"] == "Alex"
    assert body["profile"]["embeddingCount"] == 1
    assert body["userVoiceprintProfileId"] == body["profile"]["id"]

    settings = client.get("/api/user-settings").json()
    assert settings["userVoiceprintProfileId"] == body["profile"]["id"]


def test_get_voiceprint_profile_detail(client, db_session):


    create = client.post(
        "/api/voiceprint-profiles",
        json={"displayName": "Robert", "notes": "Host"},
    )
    profile_id = create.json()["id"]

    detail = client.get(f"/api/voiceprint-profiles/{profile_id}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["displayName"] == "Robert"
    assert "embeddingDescription" in body
    assert body["embeddings"] == []
    assert body["relatedRecordings"] == []


def test_health_includes_voiceprint_profiles_flags(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    capabilities = response.json()["capabilities"]
    assert "voiceprintProfilesEnabled" in capabilities
    assert "voiceprintProfilesConsentGiven" in capabilities
