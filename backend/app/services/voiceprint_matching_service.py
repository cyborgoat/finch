from dataclasses import dataclass

import numpy as np
from sqlmodel import Session

from app.config import Settings, get_settings
from app.services.diarization_service import DiarizationTurn
from app.services.voiceprint_profile_service import VoiceprintProfileService


@dataclass(frozen=True)
class VoiceprintMatchResult:
    cluster_id: str
    display_name: str
    voiceprint_profile_id: str | None
    match_confidence: float | None
    match_status: str


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a.size == 0 or b.size == 0:
        return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


class VoiceprintMatchingService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.profile_service = VoiceprintProfileService(session, self.settings)

    def match_embedding(self, embedding: np.ndarray) -> tuple[str | None, float]:
        best_profile_id: str | None = None
        best_score = -1.0
        for profile in self.profile_service.list_profiles():
            centroid = self.profile_service.compute_centroid(profile.id)
            if centroid is None:
                continue
            score = cosine_similarity(embedding, centroid)
            if score > best_score:
                best_score = score
                best_profile_id = profile.id
        if best_profile_id is None:
            return None, 0.0
        return best_profile_id, best_score

    def resolve_display_names(
        self,
        turns: list[DiarizationTurn],
        cluster_embeddings: dict[str, np.ndarray],
    ) -> dict[str, VoiceprintMatchResult]:
        cluster_ids = sorted(
            {
                turn.cluster_id or turn.speaker
                for turn in turns
            }
        )
        profiles = {
            profile.id: profile
            for profile in self.profile_service.list_profiles()
        }

        results: dict[str, VoiceprintMatchResult] = {}
        unknown_count = 0

        for cluster_id in cluster_ids:
            generic_label = next(
                (turn.speaker for turn in turns if (turn.cluster_id or turn.speaker) == cluster_id),
                f"Speaker {cluster_ids.index(cluster_id) + 1}",
            )
            embedding = cluster_embeddings.get(cluster_id)
            if embedding is None:
                results[cluster_id] = VoiceprintMatchResult(
                    cluster_id=cluster_id,
                    display_name=generic_label,
                    voiceprint_profile_id=None,
                    match_confidence=None,
                    match_status="unmatched",
                )
                continue

            profile_id, confidence = self.match_embedding(embedding)
            if profile_id and confidence >= self.settings.speaker_match_threshold:
                profile = profiles[profile_id]
                results[cluster_id] = VoiceprintMatchResult(
                    cluster_id=cluster_id,
                    display_name=profile.display_name,
                    voiceprint_profile_id=profile_id,
                    match_confidence=confidence,
                    match_status="matched",
                )
            else:
                unknown_count += 1
                suffix = "" if unknown_count == 1 else f" {unknown_count}"
                results[cluster_id] = VoiceprintMatchResult(
                    cluster_id=cluster_id,
                    display_name=f"Unknown Speaker{suffix}",
                    voiceprint_profile_id=None,
                    match_confidence=confidence if profile_id else None,
                    match_status="unknown",
                )

        return results

    def apply_names_to_turns(
        self,
        turns: list[DiarizationTurn],
        resolutions: dict[str, VoiceprintMatchResult],
    ) -> list[DiarizationTurn]:
        updated: list[DiarizationTurn] = []
        for turn in turns:
            cluster_id = turn.cluster_id or turn.speaker
            resolution = resolutions.get(cluster_id)
            if resolution is None:
                updated.append(turn)
                continue
            updated.append(
                DiarizationTurn(
                    speaker=resolution.display_name,
                    start_sec=turn.start_sec,
                    end_sec=turn.end_sec,
                    cluster_id=turn.cluster_id,
                )
            )
        return updated
