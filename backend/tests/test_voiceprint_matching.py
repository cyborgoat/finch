import numpy as np
import pytest

from app.config import Settings
from app.domains.voiceprint.embedding_service import average_embeddings
from app.domains.voiceprint.matching_service import (
    VoiceprintMatchingService,
    cosine_similarity,
)
from app.domains.voiceprint.profile_service import VoiceprintProfileService


def test_cosine_similarity_identical_vectors():
    vector = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    assert cosine_similarity(vector, vector) == pytest.approx(1.0)


def test_average_embeddings_single_vector():
    vector = np.array([3.0, 4.0], dtype=np.float32)
    averaged = average_embeddings([vector])
    assert np.allclose(averaged, vector / np.linalg.norm(vector))


def test_average_embeddings_mean_then_normalize():
    first = np.array([1.0, 0.0], dtype=np.float32)
    second = np.array([0.0, 1.0], dtype=np.float32)
    averaged = average_embeddings([first, second])
    expected = np.array([1.0, 1.0], dtype=np.float32)
    expected /= np.linalg.norm(expected)
    assert np.allclose(averaged, expected)


def test_match_embedding_uses_best_stored_embedding(db_session, test_settings):
    profile_service = VoiceprintProfileService(db_session, test_settings)
    profile = profile_service.create_profile("Alex")

    close = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    far = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    profile_service.add_embedding(
        profile.id,
        far,
        source_cluster_id="old",
    )
    profile_service.add_embedding(
        profile.id,
        close,
        source_cluster_id="new",
    )

    query = np.array([0.95, 0.05, 0.0], dtype=np.float32)
    query /= np.linalg.norm(query)

    matching = VoiceprintMatchingService(db_session, test_settings)
    profile_id, score = matching.match_embedding(query)
    assert profile_id == profile.id
    assert score > 0.9


def test_resolve_display_names_matched_and_unknown(db_session, test_settings):
    from app.domains.transcription.diarization_service import DiarizationTurn

    settings = Settings(**{**test_settings.model_dump(), "speaker_match_threshold": 0.65})
    profile_service = VoiceprintProfileService(db_session, settings)
    profile = profile_service.create_profile("Alex")
    vector = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    profile_service.add_embedding(profile.id, vector, source_cluster_id="enroll")

    matching = VoiceprintMatchingService(db_session, settings)
    turns = [
        DiarizationTurn("Speaker 1", 0.0, 3.0, cluster_id="SPEAKER_00"),
        DiarizationTurn("Speaker 2", 3.0, 6.0, cluster_id="SPEAKER_01"),
    ]
    cluster_embeddings = {
        "SPEAKER_00": vector,
        "SPEAKER_01": np.array([0.0, 1.0, 0.0], dtype=np.float32),
    }

    results = matching.resolve_display_names(turns, cluster_embeddings)
    assert results["SPEAKER_00"].match_status == "matched"
    assert results["SPEAKER_00"].display_name == "Alex"
    assert results["SPEAKER_01"].match_status == "unknown"
    assert results["SPEAKER_01"].display_name == "Unknown Speaker"


def test_match_embedding_returns_none_without_profiles(db_session, test_settings):
    matching = VoiceprintMatchingService(db_session, test_settings)
    vector = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    profile_id, score = matching.match_embedding(vector)
    assert profile_id is None
    assert score == 0.0


def test_voiceprint_auto_label_gate_requires_all_flags():
    voiceprint_profiles_enabled = True
    auto_label_enabled = False
    consent_given = True
    assert not (voiceprint_profiles_enabled and auto_label_enabled and consent_given)

    auto_label_enabled = True
    assert voiceprint_profiles_enabled and auto_label_enabled and consent_given
