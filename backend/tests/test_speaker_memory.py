import numpy as np
import pytest
from sqlmodel import Session

from app.config import Settings
from app.services.diarization_service import DiarizationTurn
from app.services.speaker_matching_service import SpeakerMatchingService, cosine_similarity
from app.services.speaker_profile_service import SpeakerProfileService


def _unit_vector(values: tuple[float, ...]) -> np.ndarray:
    vector = np.array(values, dtype=np.float32)
    return vector / np.linalg.norm(vector)


def test_cosine_similarity_identical_vectors():
    vector = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    assert cosine_similarity(vector, vector) == pytest.approx(1.0)


def test_speaker_matching_assigns_known_profile(db_session: Session):
    settings = Settings(speaker_match_threshold=0.99)
    profile_service = SpeakerProfileService(db_session, settings)
    matching_service = SpeakerMatchingService(db_session, settings)

    profile = profile_service.create_profile("Robert")
    vector = _unit_vector((1.0, 0.0, 0.0))
    profile_service.add_embedding(profile.id, vector)

    cluster_embeddings = {
        "SPEAKER_00": vector,
        "SPEAKER_01": _unit_vector((0.0, 1.0, 0.0)),
    }
    turns = [
        DiarizationTurn("Speaker 1", 0.0, 2.0, cluster_id="SPEAKER_00"),
        DiarizationTurn("Speaker 2", 2.0, 4.0, cluster_id="SPEAKER_01"),
    ]
    resolutions = matching_service.resolve_display_names(turns, cluster_embeddings)
    assert resolutions["SPEAKER_00"].display_name == "Robert"
    assert resolutions["SPEAKER_00"].match_status == "matched"
    assert resolutions["SPEAKER_01"].match_status == "unknown"


def test_speaker_profile_requires_consent_for_enroll(db_session: Session):
    from app.core.errors import AppError
    from datetime import UTC, datetime

    from app.models.audio_asset import AudioAsset
    from app.models.transcript import Transcript
    from app.services.diarization_service import SpeakerSegment, speaker_segments_to_json
    from app.services.speaker_profile_service import SpeakerProfileService

    settings = Settings()
    profile_service = SpeakerProfileService(db_session, settings)

    now = datetime.now(UTC)
    db_session.add(
        AudioAsset(
            id="audio_test",
            source="upload",
            filename="sample.wav",
            mime_type="audio/wav",
            size_bytes=100,
            original_path="/tmp/sample.wav",
            normalized_path="/tmp/sample.wav",
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
        )
    ]
    db_session.add(
        Transcript(
            id="transcript_test",
            audio_asset_id="audio_test",
            title="Test",
            raw_text="Speaker 1: Hello",
            speaker_segments=speaker_segments_to_json(segments),
            status="draft",
            created_at=now,
            updated_at=now,
        )
    )
    db_session.commit()

    with pytest.raises(AppError) as exc_info:
        profile_service.enroll_from_transcript(
            "transcript_test",
            "SPEAKER_00",
            "Robert",
        )
    assert exc_info.value.code == "SPEAKER_MEMORY_CONSENT_REQUIRED"
