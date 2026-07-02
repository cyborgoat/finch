import logging
import math
from collections.abc import Callable

from pydantic import BaseModel

from app.config import Settings, get_settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)

CHUNK_SECONDS = 45
SINGLE_PASS_MAX_SECONDS = 60

ChunkCallback = Callable[[int, int, float, float, str, str | None], None] | None


class AsrResult(BaseModel):
    text: str
    language: str | None = None
    duration_seconds: float | None = None


class AsrService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._model = None

    def _resolve_device(self) -> str:
        if self.settings.asr_device != "auto":
            return self.settings.asr_device

        try:
            import torch

            if torch.cuda.is_available():
                return "cuda:0"
            if torch.backends.mps.is_available():
                return "mps"
        except ImportError:
            pass
        return "cpu"

    def _resolve_dtype(self):
        import torch

        if self.settings.asr_dtype == "float16":
            return torch.float16
        if self.settings.asr_dtype == "bfloat16":
            return torch.bfloat16
        if self.settings.asr_dtype == "float32":
            return torch.float32

        device = self._resolve_device()
        if device.startswith("cuda"):
            return torch.bfloat16
        return torch.float32

    def load_model(self) -> None:
        if self._model is not None:
            return

        try:
            import torch  # noqa: F401
            from qwen_asr import Qwen3ASRModel
        except ImportError as exc:
            raise AppError(
                "ASR_MODEL_LOAD_FAILED",
                (
                    "qwen-asr and torch are required for transcription. "
                    "Install with: uv add torch qwen-asr"
                ),
                500,
            ) from exc

        try:
            device = self._resolve_device()
            dtype = self._resolve_dtype()
            logger.info(
                "Loading ASR model %s (device=%s, dtype=%s)",
                self.settings.asr_model_id,
                device,
                dtype,
            )
            self._model = Qwen3ASRModel.from_pretrained(
                self.settings.asr_model_id,
                dtype=dtype,
                device_map=device,
                max_inference_batch_size=1,
                max_new_tokens=4096,
            )
        except Exception as exc:
            raise AppError(
                "ASR_MODEL_LOAD_FAILED",
                f"ASR model failed to load: {exc}",
                500,
            ) from exc

        logger.info("ASR model loaded successfully")

    def _transcribe_chunked(
        self,
        audio_path: str,
        resolved_language: str | None,
        duration: float,
        on_chunk: ChunkCallback = None,
    ) -> AsrResult:
        import librosa
        import numpy as np

        audio, sample_rate = librosa.load(audio_path, sr=16000, mono=True)
        chunk_samples = CHUNK_SECONDS * sample_rate
        min_samples = int(0.5 * sample_rate)
        total_chunks = max(1, math.ceil(len(audio) / chunk_samples))

        texts: list[str] = []
        detected_language: str | None = None
        chunk_index = 0

        for start in range(0, len(audio), chunk_samples):
            chunk = audio[start : start + chunk_samples]
            if len(chunk) < min_samples:
                break

            chunk_index += 1
            start_sec = start / sample_rate
            end_sec = min((start + len(chunk)) / sample_rate, duration)

            logger.info(
                "Transcribing chunk %s/%s (%.1fs - %.1fs)",
                chunk_index,
                total_chunks,
                start_sec,
                end_sec,
            )

            results = self._model.transcribe(
                audio=(chunk.astype(np.float32), sample_rate),
                language=resolved_language,
            )
            result = results[0]
            chunk_text = result.text.strip()

            logger.info(
                "Chunk %s/%s transcript (%s): %s",
                chunk_index,
                total_chunks,
                result.language or "unknown",
                chunk_text or "(empty)",
            )

            if on_chunk is not None:
                on_chunk(chunk_index, total_chunks, start_sec, end_sec, chunk_text, result.language)

            if chunk_text:
                texts.append(chunk_text)
            if result.language and not detected_language:
                detected_language = result.language

        return AsrResult(
            text=" ".join(texts),
            language=detected_language,
            duration_seconds=duration,
        )

    def transcribe(
        self,
        audio_path: str,
        language: str = "auto",
        on_chunk: ChunkCallback = None,
    ) -> AsrResult:
        self.load_model()

        try:
            import librosa

            resolved_language = None if language == "auto" else language
            duration = float(librosa.get_duration(path=audio_path))

            if duration > SINGLE_PASS_MAX_SECONDS:
                return self._transcribe_chunked(
                    audio_path,
                    resolved_language,
                    duration,
                    on_chunk=on_chunk,
                )

            logger.info("Transcribing full audio (%.1fs)", duration)
            results = self._model.transcribe(
                audio=audio_path,
                language=resolved_language,
            )
            result = results[0]
            chunk_text = result.text.strip()
            logger.info(
                "Single-pass transcript (%s): %s",
                result.language or "unknown",
                chunk_text or "(empty)",
            )
            if on_chunk is not None:
                on_chunk(1, 1, 0.0, duration, chunk_text, result.language)
            return AsrResult(
                text=result.text.strip(),
                language=result.language,
                duration_seconds=duration,
            )
        except AppError:
            raise
        except Exception as exc:
            raise AppError(
                "ASR_TRANSCRIPTION_FAILED",
                f"ASR transcription failed: {exc}",
                500,
            ) from exc
