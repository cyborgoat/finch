import logging
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.domains.media.subprocess_utils import run_ffmpeg
from app.domains.transcription.types import DiarizationTurn

logger = logging.getLogger(__name__)

SAMPLE_RATE = 16000


@dataclass(frozen=True)
class SpeechRegion:
    original_start: float
    original_end: float
    compressed_start: float


@dataclass
class PurifiedAudio:
    path: str
    duration_sec: float
    time_map: list[SpeechRegion]
    temp_dir: Path
    original_duration_sec: float


_silero_vad_model = None
_silero_vad_utils = None


def _load_silero_vad():
    global _silero_vad_model, _silero_vad_utils
    if _silero_vad_model is None:
        import torch

        model, utils = torch.hub.load(
            "snakers4/silero-vad",
            "silero_vad",
            trust_repo=True,
        )
        _silero_vad_model = model
        _silero_vad_utils = utils
    return _silero_vad_model, _silero_vad_utils


def merge_speech_regions(
    regions: list[tuple[float, float]],
    *,
    merge_gap_seconds: float,
    min_speech_seconds: float,
) -> list[tuple[float, float]]:
    if not regions:
        return []

    sorted_regions = sorted(regions)
    merged: list[tuple[float, float]] = [sorted_regions[0]]
    for start, end in sorted_regions[1:]:
        previous_start, previous_end = merged[-1]
        if start - previous_end <= merge_gap_seconds:
            merged[-1] = (previous_start, max(previous_end, end))
        else:
            merged.append((start, end))

    return [
        (start, end)
        for start, end in merged
        if end - start >= min_speech_seconds
    ]


def build_time_map(regions: list[tuple[float, float]]) -> list[SpeechRegion]:
    compressed_start = 0.0
    time_map: list[SpeechRegion] = []
    for original_start, original_end in regions:
        time_map.append(
            SpeechRegion(
                original_start=original_start,
                original_end=original_end,
                compressed_start=compressed_start,
            )
        )
        compressed_start += original_end - original_start
    return time_map


def remap_compressed_to_original(
    timestamp_sec: float,
    time_map: list[SpeechRegion],
    *,
    is_end: bool = False,
) -> float:
    if not time_map:
        return timestamp_sec

    if timestamp_sec <= time_map[0].compressed_start:
        return time_map[0].original_start

    for region in time_map:
        region_duration = region.original_end - region.original_start
        compressed_end = region.compressed_start + region_duration
        if is_end:
            in_region = region.compressed_start < timestamp_sec <= compressed_end
        else:
            in_region = region.compressed_start <= timestamp_sec < compressed_end
        if in_region:
            return region.original_start + (timestamp_sec - region.compressed_start)

    return time_map[-1].original_end


def remap_turns_to_original(
    turns: list[DiarizationTurn],
    time_map: list[SpeechRegion],
) -> list[DiarizationTurn]:
    remapped: list[DiarizationTurn] = []
    for turn in turns:
        start_sec = remap_compressed_to_original(turn.start_sec, time_map, is_end=False)
        end_sec = remap_compressed_to_original(turn.end_sec, time_map, is_end=True)
        if end_sec < start_sec:
            end_sec = start_sec
        remapped.append(
            DiarizationTurn(
                speaker=turn.speaker,
                start_sec=start_sec,
                end_sec=end_sec,
                cluster_id=turn.cluster_id,
            )
        )
    return remapped


def format_purification_note(original_duration_sec: float, purified_duration_sec: float) -> str:
    original_min = original_duration_sec / 60
    purified_min = purified_duration_sec / 60
    return (
        f"Audio purified before diarization: "
        f"{original_min:.1f} min → {purified_min:.1f} min speech"
    )


def _denoise_audio(source_path: str, output_path: str, *, settings: Settings) -> None:
    run_ffmpeg(
        [
            "-y",
            "-i",
            source_path,
            "-af",
            "afftdn",
            "-ar",
            str(SAMPLE_RATE),
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            output_path,
        ],
        settings=settings,
        error_code="AUDIO_PURIFICATION_FAILED",
        error_message="Could not denoise audio before diarization.",
    )


def _probe_duration(path: str) -> float:
    try:
        return float(librosa.get_duration(path=path))
    except Exception as exc:
        raise AppError(
            "AUDIO_PURIFICATION_FAILED",
            "Could not read audio duration.",
            500,
        ) from exc


def detect_speech_regions(
    audio_path: str,
    *,
    min_speech_duration_ms: int,
    min_silence_duration_ms: int,
    speech_pad_ms: int,
) -> list[tuple[float, float]]:
    model, utils = _load_silero_vad()
    get_speech_timestamps = utils[0]
    read_audio = utils[2]

    wav = read_audio(audio_path, sampling_rate=SAMPLE_RATE)
    timestamps = get_speech_timestamps(
        wav,
        model,
        sampling_rate=SAMPLE_RATE,
        min_speech_duration_ms=min_speech_duration_ms,
        min_silence_duration_ms=min_silence_duration_ms,
        speech_pad_ms=speech_pad_ms,
        return_seconds=True,
    )
    return [(float(item["start"]), float(item["end"])) for item in timestamps]


def build_compressed_wav(
    source_path: str,
    regions: list[tuple[float, float]],
    output_path: str,
) -> float:
    data, sample_rate = sf.read(source_path, dtype="float32")
    if data.ndim > 1:
        data = data.mean(axis=1)

    chunks: list[np.ndarray] = []
    for start_sec, end_sec in regions:
        start_sample = max(int(start_sec * sample_rate), 0)
        end_sample = min(int(end_sec * sample_rate), len(data))
        if end_sample > start_sample:
            chunks.append(data[start_sample:end_sample])

    if not chunks:
        raise AppError(
            "AUDIO_PURIFICATION_FAILED",
            "No speech audio could be extracted for purification.",
            500,
        )

    compressed = np.concatenate(chunks)
    sf.write(output_path, compressed, sample_rate)
    return len(compressed) / sample_rate


def cleanup_purified(purified: PurifiedAudio | None) -> None:
    if purified is None:
        return
    shutil.rmtree(purified.temp_dir, ignore_errors=True)


class AudioPurificationService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def prepare_for_diarization(self, source_path: str) -> PurifiedAudio | None:
        vad_input_path = source_path
        temp_dir = Path(tempfile.mkdtemp(prefix="finch_purify_"))
        denoised_path = temp_dir / "denoised.wav"
        purified_path = temp_dir / "purified.wav"

        try:
            source_duration = _probe_duration(source_path)
            if (
                self.settings.audio_purification_denoise
                and source_duration
                <= self.settings.audio_purification_denoise_max_duration_seconds
            ):
                _denoise_audio(source_path, str(denoised_path), settings=self.settings)
                vad_input_path = str(denoised_path)
            elif self.settings.audio_purification_denoise:
                logger.info(
                    "Skipping denoise for %.1fs audio (limit %.0fs)",
                    source_duration,
                    self.settings.audio_purification_denoise_max_duration_seconds,
                )

            raw_regions = detect_speech_regions(
                vad_input_path,
                min_speech_duration_ms=self.settings.audio_purification_min_speech_ms,
                min_silence_duration_ms=self.settings.audio_purification_min_silence_ms,
                speech_pad_ms=self.settings.audio_purification_speech_pad_ms,
            )
            if not raw_regions:
                logger.warning(
                    "Audio purification found no speech in %s — "
                    "using original audio for diarization",
                    source_path,
                )
                cleanup_purified(
                    PurifiedAudio(
                        path="",
                        duration_sec=0.0,
                        time_map=[],
                        temp_dir=temp_dir,
                        original_duration_sec=0.0,
                    )
                )
                return None

            merged_regions = merge_speech_regions(
                raw_regions,
                merge_gap_seconds=self.settings.audio_purification_merge_gap_seconds,
                min_speech_seconds=self.settings.audio_purification_min_speech_ms / 1000,
            )
            if not merged_regions:
                logger.warning(
                    "Audio purification dropped all speech regions in %s — "
                    "using original audio for diarization",
                    source_path,
                )
                cleanup_purified(
                    PurifiedAudio(
                        path="",
                        duration_sec=0.0,
                        time_map=[],
                        temp_dir=temp_dir,
                        original_duration_sec=0.0,
                    )
                )
                return None

            time_map = build_time_map(merged_regions)
            duration_sec = build_compressed_wav(source_path, merged_regions, str(purified_path))

            original_duration_sec = _probe_duration(source_path)
            logger.info(
                "Audio purified for diarization: %.1fs → %.1fs (%d speech region(s))",
                original_duration_sec,
                duration_sec,
                len(merged_regions),
            )

            return PurifiedAudio(
                path=str(purified_path),
                duration_sec=duration_sec,
                time_map=time_map,
                temp_dir=temp_dir,
                original_duration_sec=original_duration_sec,
            )
        except Exception:
            cleanup_purified(
                PurifiedAudio(
                    path="",
                    duration_sec=0.0,
                    time_map=[],
                    temp_dir=temp_dir,
                    original_duration_sec=0.0,
                )
            )
            raise

