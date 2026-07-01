import json
import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path

from pydantic import BaseModel

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.storage.file_store import safe_join

logger = logging.getLogger(__name__)

DEFAULT_MIN_SEGMENT_SECONDS = 0.3

PYANOTE_COMMUNITY_MODEL = "pyannote/speaker-diarization-community-1"
PYANOTE_COMMUNITY_MODEL_URL = f"https://huggingface.co/{PYANOTE_COMMUNITY_MODEL}"


def format_diarization_load_error(exc: Exception, pipeline_id: str) -> str:
    message = str(exc)
    lower = message.lower()
    if (
        "403" in message
        or "gated repo" in lower
        or "not in the authorized list" in lower
        or "restricted" in lower
    ):
        model_url = f"https://huggingface.co/{pipeline_id}"
        return (
            "Hugging Face access denied for the diarization model (403 gated repo). "
            f"Log in at {model_url}, click 'Agree and access repository', then ensure "
            "HF_TOKEN in .env belongs to that same Hugging Face account. "
            "Create a read token at https://huggingface.co/settings/tokens if needed."
        )
    return f"Diarization pipeline failed to load: {message}"


def verify_huggingface_pipeline_access(
    pipeline_id: str,
    token: str,
) -> tuple[bool, str | None]:
    try:
        from huggingface_hub import HfApi

        HfApi(token=token).model_info(pipeline_id)
        return True, None
    except Exception as exc:
        return False, format_diarization_load_error(exc, pipeline_id)


_pipeline_access_cache: dict[str, tuple[bool, str | None]] = {}


def get_cached_pipeline_access(
    pipeline_id: str,
    token: str | None,
) -> tuple[bool, str | None] | None:
    if not token:
        return None
    cache_key = f"{pipeline_id}:{token[:8]}"
    if cache_key not in _pipeline_access_cache:
        _pipeline_access_cache[cache_key] = verify_huggingface_pipeline_access(
            pipeline_id,
            token,
        )
    return _pipeline_access_cache[cache_key]


def resolve_hf_token(
    settings: Settings | None = None,
    *,
    stored_token: str | None = None,
) -> str | None:
    settings = settings or get_settings()
    if stored_token and stored_token.strip():
        return stored_token.strip()
    if settings.hf_token:
        return settings.hf_token
    try:
        from huggingface_hub import get_token

        return get_token()
    except ImportError:
        return None


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
    speaker_profile_id: str | None = None
    match_confidence: float | None = None
    match_status: str | None = None


class DiarizationService:
    def __init__(
        self,
        settings: Settings | None = None,
        *,
        hf_token: str | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.hf_token = hf_token
        self._pipeline = None

    def load_pipeline(self) -> None:
        if self._pipeline is not None:
            return

        try:
            import torch
            from pyannote.audio import Pipeline
        except ImportError as exc:
            raise AppError(
                "DIARIZATION_MODEL_LOAD_FAILED",
                (
                    "pyannote-audio is required for speaker diarization. "
                    "Install with: uv add pyannote-audio"
                ),
                500,
            ) from exc

        token = resolve_hf_token(self.settings, stored_token=self.hf_token)
        if not token:
            raise AppError(
                "DIARIZATION_MODEL_LOAD_FAILED",
                (
                    "Hugging Face token is required for pyannote speaker diarization. "
                    "Add it in Settings → Transcription or run: huggingface-cli login"
                ),
                500,
            )

        try:
            logger.info(
                "Loading diarization pipeline %s (token=%s)",
                self.settings.diarization_pipeline_id,
                "configured" if token else "missing",
            )
            self._pipeline = Pipeline.from_pretrained(
                self.settings.diarization_pipeline_id,
                token=token,
            )
            if torch.cuda.is_available():
                device = torch.device("cuda")
            elif torch.backends.mps.is_available():
                device = torch.device("mps")
            else:
                device = torch.device("cpu")
            self._pipeline.to(device)
            logger.info("Diarization pipeline loaded on device: %s", device)
        except Exception as exc:
            raise AppError(
                "DIARIZATION_MODEL_LOAD_FAILED",
                format_diarization_load_error(exc, self.settings.diarization_pipeline_id),
                500,
            ) from exc

    def unload_pipeline(self) -> None:
        self._pipeline = None
        try:
            import gc

            import torch

            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            elif torch.backends.mps.is_available():
                torch.mps.empty_cache()
        except ImportError:
            pass

    def diarize(self, audio_path: str, duration_seconds: float | None = None) -> list[DiarizationTurn]:
        self.load_pipeline()

        try:
            logger.info("Running speaker diarization on %s", audio_path)
            output = self._pipeline(audio_path)
            annotation = (
                output.exclusive_speaker_diarization
                if self.settings.diarization_use_exclusive
                else output.speaker_diarization
            )
            turns: list[DiarizationTurn] = []
            speaker_map: dict[str, str] = {}
            speaker_index = 0

            for turn, speaker_label in annotation:
                label = str(speaker_label)
                if label not in speaker_map:
                    speaker_index += 1
                    speaker_map[label] = f"Speaker {speaker_index}"
                turns.append(
                    DiarizationTurn(
                        speaker=speaker_map[label],
                        start_sec=float(turn.start),
                        end_sec=float(turn.end),
                        cluster_id=label,
                    )
                )
            logger.info(
                "Diarization found %d turn(s) across %d speaker(s)",
                len(turns),
                len(speaker_map),
            )
            return turns
        except AppError:
            raise
        except Exception as exc:
            logger.exception("Speaker diarization failed for %s", audio_path)
            raise AppError(
                "DIARIZATION_FAILED",
                f"Speaker diarization failed: {exc}",
                500,
            ) from exc


def merge_adjacent_turns(
    turns: list[DiarizationTurn],
    *,
    min_segment_seconds: float = DEFAULT_MIN_SEGMENT_SECONDS,
    merge_gap_seconds: float = 0.0,
    max_segments: int = 0,
) -> list[DiarizationTurn]:
    if not turns:
        return []

    merged: list[DiarizationTurn] = [turns[0]]
    for turn in turns[1:]:
        previous = merged[-1]
        gap = max(turn.start_sec - previous.end_sec, 0.0)
        if turn.speaker == previous.speaker and (
            previous.cluster_id is None
            or turn.cluster_id is None
            or turn.cluster_id == previous.cluster_id
        ) and gap <= merge_gap_seconds:
            merged[-1] = DiarizationTurn(
                previous.speaker,
                previous.start_sec,
                max(previous.end_sec, turn.end_sec),
                cluster_id=previous.cluster_id or turn.cluster_id,
            )
        else:
            merged.append(turn)

    filtered = [
        turn
        for turn in merged
        if turn.end_sec - turn.start_sec >= min_segment_seconds
    ]

    if max_segments > 0 and len(filtered) > max_segments:
        logger.warning(
            "Diarization produced %d segments; capping at DIARIZATION_MAX_SEGMENTS=%d",
            len(filtered),
            max_segments,
        )
        return filtered[:max_segments]

    return filtered


def extract_audio_slice(
    source_path: str,
    start_sec: float,
    end_sec: float,
    output_dir: str,
    segment_id: str,
) -> str:
    duration = max(end_sec - start_sec, DEFAULT_MIN_SEGMENT_SECONDS)
    output_path = safe_join(output_dir, f"{segment_id}.wav")

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-ss",
                str(start_sec),
                "-i",
                source_path,
                "-t",
                str(duration),
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                str(output_path),
            ],
            check=True,
            capture_output=True,
        )
    except FileNotFoundError as exc:
        raise AppError(
            "AUDIO_NORMALIZATION_FAILED",
            "ffmpeg is not installed or not available on PATH.",
            500,
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise AppError(
            "DIARIZATION_FAILED",
            "Could not extract audio segment for transcription.",
            500,
        ) from exc

    return str(output_path)


def build_labeled_transcript(segments: list[SpeakerSegment]) -> str:
    blocks: list[str] = []
    for segment in segments:
        text = segment.text.strip()
        if not text:
            continue
        blocks.append(f"{segment.speaker}: {text}")
    return "\n\n".join(blocks)


def speaker_segments_to_json(segments: list[SpeakerSegment]) -> str:
    return json.dumps([segment.model_dump() for segment in segments])


def speaker_segments_from_json(raw: str | None) -> list[SpeakerSegment]:
    if not raw:
        return []
    data = json.loads(raw)
    return [SpeakerSegment.model_validate(item) for item in data]


def cleanup_temp_dir(temp_dir: Path) -> None:
    for path in temp_dir.glob("*.wav"):
        path.unlink(missing_ok=True)
