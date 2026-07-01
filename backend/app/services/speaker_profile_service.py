import logging

import numpy as np
from sqlmodel import Session, select

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.core.ids import generate_speaker_embedding_id, generate_speaker_profile_id
from app.models.speaker_profile import SpeakerEmbedding, SpeakerProfile
from app.services.app_preference_service import AppPreferenceService
from app.services.audio_service import AudioService
from app.services.diarization_service import (
    speaker_segments_from_json,
)
from app.services.speaker_embedding_service import (
    SpeakerEmbeddingService,
    embedding_from_json,
    embedding_to_json,
)

logger = logging.getLogger(__name__)


class SpeakerProfileService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.embedding_service = SpeakerEmbeddingService(self.settings)

    def list_profiles(self) -> list[SpeakerProfile]:
        statement = select(SpeakerProfile).order_by(SpeakerProfile.display_name)
        return list(self.session.exec(statement).all())

    def get_profile(self, profile_id: str) -> SpeakerProfile:
        profile = self.session.get(SpeakerProfile, profile_id)
        if profile is None:
            raise AppError("SPEAKER_PROFILE_NOT_FOUND", "Speaker profile not found.", 404)
        return profile

    def count_profiles(self) -> int:
        return len(self.list_profiles())

    def count_embeddings(self, profile_id: str) -> int:
        statement = select(SpeakerEmbedding).where(SpeakerEmbedding.profile_id == profile_id)
        return len(list(self.session.exec(statement).all()))

    def create_profile(self, display_name: str, notes: str | None = None) -> SpeakerProfile:
        from datetime import UTC, datetime

        now = datetime.now(UTC)
        profile = SpeakerProfile(
            id=generate_speaker_profile_id(),
            display_name=display_name.strip(),
            notes=notes,
            created_at=now,
            updated_at=now,
        )
        self.session.add(profile)
        self.session.commit()
        self.session.refresh(profile)
        return profile

    def update_profile(
        self,
        profile: SpeakerProfile,
        *,
        display_name: str | None = None,
        notes: str | None = None,
    ) -> SpeakerProfile:
        from datetime import UTC, datetime

        if display_name is not None:
            profile.display_name = display_name.strip()
        if notes is not None:
            profile.notes = notes
        profile.updated_at = datetime.now(UTC)
        self.session.add(profile)
        self.session.commit()
        self.session.refresh(profile)
        if display_name is not None:
            from app.services.transcript_text_service import propagate_profile_display_name

            propagate_profile_display_name(
                self.session,
                profile.id,
                profile.display_name,
                self.settings,
            )
        return profile

    def delete_profile(self, profile: SpeakerProfile) -> None:
        embeddings = self.session.exec(
            select(SpeakerEmbedding).where(SpeakerEmbedding.profile_id == profile.id)
        ).all()
        for embedding in embeddings:
            self.session.delete(embedding)
        self.session.delete(profile)
        self.session.commit()

    def delete_all_data(self) -> None:
        for embedding in self.session.exec(select(SpeakerEmbedding)).all():
            self.session.delete(embedding)
        for profile in self.session.exec(select(SpeakerProfile)).all():
            self.session.delete(profile)
        self.session.commit()
        AppPreferenceService(self.session, self.settings).clear_speaker_memory_preferences()

    def list_embeddings(self, profile_id: str | None = None) -> list[SpeakerEmbedding]:
        statement = select(SpeakerEmbedding)
        if profile_id is not None:
            statement = statement.where(SpeakerEmbedding.profile_id == profile_id)
        return list(self.session.exec(statement).all())

    def compute_centroid(self, profile_id: str) -> np.ndarray | None:
        embeddings = self.list_embeddings(profile_id)
        if not embeddings:
            return None
        vectors = [embedding_from_json(item.embedding) for item in embeddings]
        centroid = np.mean(np.stack(vectors), axis=0)
        norm = np.linalg.norm(centroid)
        if norm == 0:
            return centroid
        return centroid / norm

    def add_embedding(
        self,
        profile_id: str,
        vector: np.ndarray,
        *,
        source_transcript_id: str | None = None,
        source_cluster_id: str | None = None,
        duration_sec: float | None = None,
    ) -> SpeakerEmbedding:
        from datetime import UTC, datetime

        record = SpeakerEmbedding(
            id=generate_speaker_embedding_id(),
            profile_id=profile_id,
            embedding=embedding_to_json(vector),
            model_id=self.settings.speaker_embedding_model_id,
            source_transcript_id=source_transcript_id,
            source_cluster_id=source_cluster_id,
            duration_sec=duration_sec,
            created_at=datetime.now(UTC),
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def enroll_from_transcript(
        self,
        transcript_id: str,
        cluster_id: str,
        display_name: str,
        profile_id: str | None = None,
        *,
        start_sec: float | None = None,
        end_sec: float | None = None,
    ) -> SpeakerProfile:
        from app.services.transcript_service import TranscriptService

        preference_service = AppPreferenceService(self.session, self.settings)
        if not preference_service.has_speaker_memory_consent():
            raise AppError(
                "SPEAKER_MEMORY_CONSENT_REQUIRED",
                "Speaker memory consent is required before saving voiceprints.",
                400,
            )

        transcript_service = TranscriptService(self.session, self.settings)
        transcript = transcript_service.get_transcript(transcript_id)
        segments = speaker_segments_from_json(transcript.speaker_segments)
        if not segments:
            raise AppError(
                "SPEAKER_ENROLL_FAILED",
                "Transcript has no speaker segments to enroll from.",
                400,
            )

        audio_service = AudioService(self.session, self.settings)
        audio_asset = audio_service.get_audio(transcript.audio_asset_id)
        audio_path = audio_asset.normalized_path or audio_asset.original_path
        if not audio_path:
            raise AppError(
                "SPEAKER_ENROLL_FAILED",
                "Audio file is not available for enrollment.",
                400,
            )

        cluster_segments = [
            segment
            for segment in segments
            if (segment.cluster_id or segment.speaker) == cluster_id
        ]
        if not cluster_segments:
            raise AppError(
                "SPEAKER_ENROLL_FAILED",
                f"No segments found for cluster {cluster_id}.",
                404,
            )

        if start_sec is not None and end_sec is not None and end_sec > start_sec:
            sample_start = start_sec
            sample_end = end_sec
        else:
            longest = max(
                cluster_segments,
                key=lambda segment: segment.end_sec - segment.start_sec,
            )
            sample_start = longest.start_sec
            sample_end = longest.end_sec

        duration = sample_end - sample_start
        vector = self.embedding_service.extract_embedding(
            audio_path,
            sample_start,
            sample_end,
        )

        if profile_id:
            profile = self.get_profile(profile_id)
            profile = self.update_profile(profile, display_name=display_name)
        else:
            profile = self.create_profile(display_name)

        self.add_embedding(
            profile.id,
            vector,
            source_transcript_id=transcript_id,
            source_cluster_id=cluster_id,
            duration_sec=duration,
        )
        return profile

    def count_related_transcripts(self, profile_id: str) -> int:
        from app.models.transcript import Transcript
        from app.services.diarization_service import speaker_segments_from_json

        count = 0
        for transcript in self.session.exec(select(Transcript)).all():
            segments = speaker_segments_from_json(transcript.speaker_segments)
            if any(segment.speaker_profile_id == profile_id for segment in segments):
                count += 1
        return count

    def get_profile_detail(self, profile_id: str) -> dict:
        from app.models.transcript import Transcript
        from app.services.diarization_service import speaker_segments_from_json

        profile = self.get_profile(profile_id)
        embeddings = self.list_embeddings(profile_id)
        embedding_summaries = []
        for record in embeddings:
            vector = embedding_from_json(record.embedding)
            embedding_summaries.append(
                {
                    "id": record.id,
                    "model_id": record.model_id,
                    "source_transcript_id": record.source_transcript_id,
                    "source_cluster_id": record.source_cluster_id,
                    "duration_sec": record.duration_sec,
                    "dimensions": int(vector.size),
                    "created_at": record.created_at,
                }
            )

        related: dict[str, dict] = {}
        for transcript in self.session.exec(select(Transcript)).all():
            segments = speaker_segments_from_json(transcript.speaker_segments)
            count = sum(
                1 for segment in segments if segment.speaker_profile_id == profile_id
            )
            if count:
                related[transcript.id] = {
                    "id": transcript.id,
                    "title": transcript.title,
                    "segment_count": count,
                    "updated_at": transcript.updated_at,
                }

        model_ids = {item["model_id"] for item in embedding_summaries}
        if embedding_summaries:
            dimensions = embedding_summaries[0]["dimensions"]
            model_label = ", ".join(sorted(model_ids))
            embedding_description = (
                f"{dimensions}-dimensional local voiceprint vector "
                f"({model_label}). Used for cosine-similarity speaker matching."
            )
        else:
            embedding_description = (
                "No voiceprints enrolled yet. Assign this profile on a transcript "
                "by clicking a speaker pill; with speaker memory enabled in Settings, "
                "the voiceprint is stored from that turn."
            )

        return {
            "profile": profile,
            "embeddings": embedding_summaries,
            "related_transcripts": sorted(
                related.values(),
                key=lambda item: item["updated_at"],
                reverse=True,
            ),
            "embedding_description": embedding_description,
        }
