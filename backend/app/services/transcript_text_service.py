from sqlmodel import Session, select

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.models.transcript import Transcript
from app.services.diarization_service import (
    SpeakerSegment,
    build_labeled_transcript,
    speaker_segments_from_json,
    speaker_segments_to_json,
)


def resolve_segment_speaker_labels(
    segments: list[SpeakerSegment],
    profile_name_by_id: dict[str, str],
) -> list[SpeakerSegment]:
    resolved: list[SpeakerSegment] = []
    for segment in segments:
        speaker = segment.speaker
        if segment.speaker_profile_id:
            speaker = profile_name_by_id.get(segment.speaker_profile_id, speaker)
        resolved.append(segment.model_copy(update={"speaker": speaker}))
    return resolved


def build_labeled_transcript_with_profile_names(
    segments: list[SpeakerSegment],
    profile_name_by_id: dict[str, str],
) -> str:
    return build_labeled_transcript(
        resolve_segment_speaker_labels(segments, profile_name_by_id)
    )


def load_profile_display_names(
    session: Session,
    segments: list[SpeakerSegment],
    settings: Settings | None = None,
) -> dict[str, str]:
    from app.services.speaker_profile_service import SpeakerProfileService

    profile_service = SpeakerProfileService(session, settings or get_settings())
    names: dict[str, str] = {}
    for segment in segments:
        profile_id = segment.speaker_profile_id
        if not profile_id or profile_id in names:
            continue
        try:
            names[profile_id] = profile_service.get_profile(profile_id).display_name
        except AppError:
            continue
    return names


def resolve_transcript_text(
    transcript: Transcript,
    source: str,
    session: Session,
    settings: Settings | None = None,
) -> str:
    if source == "editedText" and transcript.edited_text and transcript.edited_text.strip():
        return transcript.edited_text.strip()

    segments = speaker_segments_from_json(transcript.speaker_segments)
    if segments:
        profile_names = load_profile_display_names(session, segments, settings)
        return build_labeled_transcript_with_profile_names(segments, profile_names)

    return (transcript.raw_text or "").strip()


def propagate_profile_display_name(
    session: Session,
    profile_id: str,
    display_name: str,
    settings: Settings | None = None,
) -> int:
    from app.services.transcript_service import TranscriptService

    settings = settings or get_settings()
    transcript_service = TranscriptService(session, settings)
    trimmed_name = display_name.strip()
    updated_count = 0

    for transcript in session.exec(select(Transcript)).all():
        segments = speaker_segments_from_json(transcript.speaker_segments)
        if not segments:
            continue

        changed = False
        updated_segments: list[SpeakerSegment] = []
        for segment in segments:
            if segment.speaker_profile_id != profile_id:
                updated_segments.append(segment)
                continue
            if segment.speaker != trimmed_name:
                changed = True
            updated_segments.append(segment.model_copy(update={"speaker": trimmed_name}))

        if not changed:
            continue

        transcript_service.update_transcript(
            transcript,
            raw_text=build_labeled_transcript(updated_segments),
            speaker_segments=speaker_segments_to_json(updated_segments),
        )
        updated_count += 1

    return updated_count
