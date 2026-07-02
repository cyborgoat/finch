import json
from dataclasses import dataclass

from pydantic import BaseModel


@dataclass(frozen=True)
class DiarizationTurn:
    speaker: str
    start_sec: float
    end_sec: float
    cluster_id: str | None = None


class SpeakerSegment(BaseModel):
    speaker: str
    start_sec: float
    end_sec: float
    text: str = ""
    cluster_id: str | None = None
    voiceprint_profile_id: str | None = None
    match_confidence: float | None = None
    match_status: str | None = None

    def to_api(self):
        from app.schemas.recording import SpeakerSegmentSchema

        return SpeakerSegmentSchema.model_validate(self.model_dump())


def speaker_segments_to_json(segments: list[SpeakerSegment]) -> str:
    return json.dumps([segment.model_dump() for segment in segments])


def speaker_segments_from_json(raw: str | None) -> list[SpeakerSegment]:
    if not raw:
        return []
    data = json.loads(raw)
    return [SpeakerSegment.model_validate(item) for item in data]


def build_labeled_transcript(segments: list[SpeakerSegment]) -> str:
    blocks: list[str] = []
    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue
        blocks.append(f"{segment.speaker}: {text}")
    return "\n\n".join(blocks)
