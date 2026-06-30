from sqlmodel import Session

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.services.app_preference_service import AppPreferenceService
from app.services.diarization_service import (
    SpeakerSegment,
    build_labeled_transcript,
    speaker_segments_from_json,
    speaker_segments_to_json,
)
from app.services.speaker_profile_service import SpeakerProfileService
from app.services.transcript_service import TranscriptService


class SpeakerTranscriptService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.transcript_service = TranscriptService(session, self.settings)
        self.profile_service = SpeakerProfileService(session, self.settings)
        self.preference_service = AppPreferenceService(session, self.settings)

    def update_speakers(
        self,
        transcript_id: str,
        mappings: list[dict],
    ) -> tuple[list[SpeakerSegment], str]:
        transcript = self.transcript_service.get_transcript(transcript_id)
        segments = speaker_segments_from_json(transcript.speaker_segments)
        if not segments:
            raise AppError(
                "SPEAKER_UPDATE_FAILED",
                "Transcript has no speaker segments to update.",
                400,
            )

        mapping_by_cluster = {item["cluster_id"]: item for item in mappings}

        for mapping in mappings:
            profile_id = mapping.get("profile_id")
            if profile_id:
                profile = self.profile_service.get_profile(profile_id)
                if not mapping.get("display_name", "").strip():
                    mapping["display_name"] = profile.display_name
            if mapping.get("enroll"):
                if not self.preference_service.has_speaker_memory_consent():
                    raise AppError(
                        "SPEAKER_MEMORY_CONSENT_REQUIRED",
                        "Speaker memory consent is required before saving voiceprints.",
                        400,
                    )
                profile = self.profile_service.enroll_from_transcript(
                    transcript_id=transcript_id,
                    cluster_id=mapping["cluster_id"],
                    display_name=mapping["display_name"],
                    profile_id=mapping.get("profile_id"),
                )
                mapping["profile_id"] = profile.id

        updated_segments: list[SpeakerSegment] = []
        for segment in segments:
            cluster_id = segment.cluster_id or segment.speaker
            mapping = mapping_by_cluster.get(cluster_id)
            if mapping is None:
                updated_segments.append(segment)
                continue

            updated_segments.append(
                SpeakerSegment(
                    speaker=mapping["display_name"].strip(),
                    start_sec=segment.start_sec,
                    end_sec=segment.end_sec,
                    text=segment.text,
                    cluster_id=segment.cluster_id or cluster_id,
                    speaker_profile_id=(
                        mapping.get("profile_id") or segment.speaker_profile_id
                    ),
                    match_confidence=segment.match_confidence,
                    match_status="manual",
                )
            )

        raw_text = build_labeled_transcript(updated_segments)
        self.transcript_service.update_transcript(
            transcript,
            raw_text=raw_text,
            speaker_segments=speaker_segments_to_json(updated_segments),
        )
        return updated_segments, raw_text
