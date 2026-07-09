import logging
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import librosa

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.domains.transcription.audio_purification_service import (
    build_compressed_wav,
    detect_speech_regions,
    merge_speech_regions,
)

logger = logging.getLogger(__name__)

MIN_TRIM_SECONDS = 0.5


@dataclass(frozen=True)
class ProcessedAudio:
    path: Path
    duration_sec: float
    temp_dir: Path


class AudioEditService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def process(
        self,
        source_path: str,
        *,
        trim_start_sec: float = 0.0,
        trim_end_sec: float | None = None,
        remove_silence: bool = False,
    ) -> ProcessedAudio:
        source = Path(source_path)
        if not source.is_file():
            raise AppError(
                "AUDIO_FILE_MISSING",
                "Audio file is missing from local storage.",
                404,
            )

        source_duration = self._get_duration(source_path)
        end_sec = trim_end_sec if trim_end_sec is not None else source_duration
        self._validate_trim_range(trim_start_sec, end_sec, source_duration)

        temp_dir = Path(tempfile.mkdtemp(prefix="finch_edit_"))
        try:
            trimmed_path = temp_dir / "trimmed.wav"
            self._trim_audio(source_path, str(trimmed_path), trim_start_sec, end_sec)

            output_path = trimmed_path
            if remove_silence:
                output_path = temp_dir / "processed.wav"
                self._remove_silence(str(trimmed_path), str(output_path))

            duration_sec = self._get_duration(str(output_path))
            if duration_sec <= 0:
                raise AppError(
                    "AUDIO_EDIT_NO_SPEECH",
                    "No speech audio remains after editing.",
                    400,
                )

            return ProcessedAudio(
                path=output_path,
                duration_sec=duration_sec,
                temp_dir=temp_dir,
            )
        except Exception:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise

    def estimate_output_duration(
        self,
        source_path: str,
        *,
        trim_start_sec: float = 0.0,
        trim_end_sec: float | None = None,
        remove_silence: bool = False,
    ) -> float:
        processed = self.process(
            source_path,
            trim_start_sec=trim_start_sec,
            trim_end_sec=trim_end_sec,
            remove_silence=remove_silence,
        )
        try:
            return processed.duration_sec
        finally:
            cleanup_processed(processed)

    def _validate_trim_range(
        self,
        trim_start_sec: float,
        trim_end_sec: float,
        source_duration: float,
    ) -> None:
        if trim_start_sec < 0:
            raise AppError(
                "AUDIO_EDIT_INVALID_TRIM",
                "Trim start must be zero or greater.",
                400,
            )
        if trim_end_sec > source_duration + 0.01:
            raise AppError(
                "AUDIO_EDIT_INVALID_TRIM",
                "Trim end exceeds audio duration.",
                400,
            )
        if trim_end_sec - trim_start_sec < MIN_TRIM_SECONDS:
            raise AppError(
                "AUDIO_EDIT_INVALID_TRIM",
                f"Selected range must be at least {MIN_TRIM_SECONDS} seconds.",
                400,
            )

    def _trim_audio(
        self,
        source_path: str,
        output_path: str,
        start_sec: float,
        end_sec: float,
    ) -> None:
        duration = end_sec - start_sec
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
                    output_path,
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
                "AUDIO_EDIT_FAILED",
                "Could not trim audio file.",
                500,
            ) from exc

    def _remove_silence(self, source_path: str, output_path: str) -> None:
        raw_regions = detect_speech_regions(
            source_path,
            min_speech_duration_ms=self.settings.audio_purification_min_speech_ms,
            min_silence_duration_ms=self.settings.audio_purification_min_silence_ms,
            speech_pad_ms=self.settings.audio_purification_speech_pad_ms,
        )
        if not raw_regions:
            raise AppError(
                "AUDIO_EDIT_NO_SPEECH",
                "No speech audio remains after removing silence.",
                400,
            )

        merged_regions = merge_speech_regions(
            raw_regions,
            merge_gap_seconds=self.settings.audio_purification_merge_gap_seconds,
            min_speech_seconds=self.settings.audio_purification_min_speech_ms / 1000,
        )
        if not merged_regions:
            raise AppError(
                "AUDIO_EDIT_NO_SPEECH",
                "No speech audio remains after removing silence.",
                400,
            )

        build_compressed_wav(source_path, merged_regions, output_path)

    def _get_duration(self, path: str) -> float:
        try:
            duration = librosa.get_duration(path=path)
            return float(duration)
        except Exception as exc:
            raise AppError(
                "AUDIO_EDIT_FAILED",
                "Could not read audio duration.",
                500,
            ) from exc


def cleanup_processed(processed: ProcessedAudio | None) -> None:
    if processed is None:
        return
    shutil.rmtree(processed.temp_dir, ignore_errors=True)
