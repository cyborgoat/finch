from sqlmodel import Session, select

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.models.recording import Recording
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
        if segment.voiceprint_profile_id:
            speaker = profile_name_by_id.get(segment.voiceprint_profile_id, speaker)
        resolved.append(segment.model_copy(update={"speaker": speaker}))
    return resolved


def build_labeled_transcript_with_profile_names(
    segments: list[SpeakerSegment],
    profile_name_by_id: dict[str, str],
) -> str:
    return build_labeled_transcript(
        resolve_segment_speaker_labels(segments, profile_name_by_id),
    )


def load_profile_display_names(
    session: Session,
    segments: list[SpeakerSegment],
    settings: Settings | None = None,
) -> dict[str, str]:
    from app.services.voiceprint_profile_service import VoiceprintProfileService

    profile_service = VoiceprintProfileService(session, settings or get_settings())
    names: dict[str, str] = {}
    for segment in segments:
        profile_id = segment.voiceprint_profile_id
        if not profile_id or profile_id in names:
            continue
        try:
            names[profile_id] = profile_service.get_profile(profile_id).display_name
        except AppError:
            continue
    return names


def resolve_transcript_text(
    recording: Recording,
    source: str,
    session: Session,
    settings: Settings | None = None,
) -> str:
    if source == "editedText" and recording.edited_text and recording.edited_text.strip():
        return recording.edited_text.strip()

    segments = speaker_segments_from_json(recording.speaker_segments)
    if segments:
        profile_names = load_profile_display_names(session, segments, settings)
        return build_labeled_transcript_with_profile_names(segments, profile_names)

    return (recording.raw_text or "").strip()


def propagate_profile_display_name(
    session: Session,
    profile_id: str,
    display_name: str,
    settings: Settings | None = None,
) -> int:
    from app.services.recording_service import RecordingService

    settings = settings or get_settings()
    recording_service = RecordingService(session, settings)
    trimmed_name = display_name.strip()
    updated_count = 0

    for recording in session.exec(select(Recording)).all():
        segments = speaker_segments_from_json(recording.speaker_segments)
        if not segments:
            continue

        changed = False
        updated_segments: list[SpeakerSegment] = []
        for segment in segments:
            if segment.voiceprint_profile_id != profile_id:
                updated_segments.append(segment)
                continue
            if segment.speaker != trimmed_name:
                changed = True
            updated_segments.append(segment.model_copy(update={"speaker": trimmed_name}))

        if not changed:
            continue

        recording_service.update_recording(
            recording,
            raw_text=build_labeled_transcript(updated_segments),
            speaker_segments=speaker_segments_to_json(updated_segments),
        )
        updated_count += 1

    return updated_count
