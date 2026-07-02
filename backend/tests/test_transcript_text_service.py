from datetime import UTC, datetime

from app.domains.recordings.transcript_text_service import (
    build_labeled_transcript_with_profile_names,
    resolve_transcript_text,
)
from app.domains.transcription.diarization_service import SpeakerSegment, speaker_segments_to_json
from app.models.audio_asset import AudioAsset
from app.models.recording import Recording


def test_build_labeled_transcript_with_profile_names():
    segments = [
        SpeakerSegment(
            speaker="Speaker 1",
            start_sec=0.0,
            end_sec=1.0,
            text="Hello",
            voiceprint_profile_id="profile_a",
        ),
        SpeakerSegment(
            speaker="Speaker 2",
            start_sec=1.0,
            end_sec=2.0,
            text="Hi",
        ),
    ]

    text = build_labeled_transcript_with_profile_names(
        segments,
        {"profile_a": "Robert"},
    )

    assert text == "Robert: Hello\n\nSpeaker 2: Hi"


def test_resolve_transcript_text_prefers_segments_over_raw_text(db_session):
    now = datetime.now(UTC)
    db_session.add(
        AudioAsset(
            id="audio_text",
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
            speaker="Robert",
            start_sec=0.0,
            end_sec=1.0,
            text="Hello",
            cluster_id="SPEAKER_00",
        ),
    ]
    transcript = Recording(
        id="recording_text",
        audio_asset_id="audio_text",
        title="Meeting",
        raw_text="Speaker 1: Hello",
        speaker_segments=speaker_segments_to_json(segments),
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db_session.add(transcript)
    db_session.commit()

    text = resolve_transcript_text(transcript, "editedText", db_session)

    assert text == "Robert: Hello"


def test_propagate_profile_display_name_updates_linked_transcripts(client, db_session):
    now = datetime.now(UTC)
    db_session.add(
        AudioAsset(
            id="audio_propagate",
            source="upload",
            filename="meeting.wav",
            mime_type="audio/wav",
            size_bytes=100,
            original_path="/tmp/meeting.wav",
            normalized_path="/tmp/meeting.wav",
            created_at=now,
        )
    )
    create = client.post(
        "/api/voiceprint-profiles",
        json={"displayName": "Robert"},
    )
    profile_id = create.json()["id"]

    segments = [
        SpeakerSegment(
            speaker="Robert",
            start_sec=0.0,
            end_sec=2.0,
            text="Hello",
            cluster_id="SPEAKER_00",
            voiceprint_profile_id=profile_id,
        ),
    ]
    db_session.add(
        Recording(
            id="recording_propagate",
            audio_asset_id="audio_propagate",
            title="Meeting",
            raw_text="Robert: Hello",
            speaker_segments=speaker_segments_to_json(segments),
            status="draft",
            created_at=now,
            updated_at=now,
        )
    )
    db_session.commit()

    rename = client.patch(
        f"/api/voiceprint-profiles/{profile_id}",
        json={"displayName": "Robert Smith"},
    )
    assert rename.status_code == 200

    transcript = client.get("/api/recordings/recording_propagate").json()
    assert "Robert Smith: Hello" in transcript["rawText"]
    assert transcript["speakerSegments"][0]["speaker"] == "Robert Smith"
