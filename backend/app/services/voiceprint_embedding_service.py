import json
import logging
from collections import defaultdict

import numpy as np

from app.config import Settings, get_settings
from app.core.errors import AppError
from app.services.diarization_service import DiarizationTurn, extract_audio_slice
from app.services.diarization_service import resolve_hf_token

logger = logging.getLogger(__name__)


def _normalize_vector(vector: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vector)
    if norm == 0:
        return vector
    return vector / norm


def embedding_to_json(vector: np.ndarray) -> str:
    return json.dumps([float(value) for value in vector.tolist()])


def embedding_from_json(raw: str) -> np.ndarray:
    return np.array(json.loads(raw), dtype=np.float32)


class VoiceprintEmbeddingService:
    def __init__(
        self,
        settings: Settings | None = None,
        *,
        hf_token: str | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.hf_token = hf_token
        self._inference = None

    def load_model(self) -> None:
        if self._inference is not None:
            return

        try:
            import torch
            from pyannote.audio import Inference, Model
        except ImportError as exc:
            raise AppError(
                "SPEAKER_EMBEDDING_MODEL_LOAD_FAILED",
                (
                    "pyannote-audio is required for speaker memory. "
                    "Install with: uv add pyannote-audio"
                ),
                500,
            ) from exc

        token = resolve_hf_token(self.settings, stored_token=self.hf_token)
        if not token:
            raise AppError(
                "SPEAKER_EMBEDDING_MODEL_LOAD_FAILED",
                "Hugging Face token is required for speaker embeddings. Set HF_TOKEN in .env.",
                500,
            )

        try:
            model = Model.from_pretrained(
                self.settings.speaker_embedding_model_id,
                token=token,
            )
            if torch.cuda.is_available():
                device = torch.device("cuda")
            elif torch.backends.mps.is_available():
                device = torch.device("mps")
            else:
                device = torch.device("cpu")
            self._inference = Inference(model, window="whole", device=device)
            logger.info(
                "Speaker embedding model loaded: %s on %s",
                self.settings.speaker_embedding_model_id,
                device,
            )
        except Exception as exc:
            raise AppError(
                "SPEAKER_EMBEDDING_MODEL_LOAD_FAILED",
                f"Speaker embedding model failed to load: {exc}",
                500,
            ) from exc

    def unload_model(self) -> None:
        self._inference = None

    def extract_embedding(self, audio_path: str, start_sec: float, end_sec: float) -> np.ndarray:
        self.load_model()
        import tempfile
        from pathlib import Path

        temp_dir = Path(tempfile.mkdtemp(prefix="finch_embed_"))
        try:
            slice_path = extract_audio_slice(
                audio_path,
                start_sec,
                end_sec,
                str(temp_dir),
                "embed",
            )
            embedding = np.array(self._inference(slice_path), dtype=np.float32).reshape(-1)
            return _normalize_vector(embedding)
        finally:
            for path in temp_dir.glob("*.wav"):
                path.unlink(missing_ok=True)
            temp_dir.rmdir()

    def extract_cluster_embeddings(
        self,
        audio_path: str,
        turns: list[DiarizationTurn],
    ) -> dict[str, np.ndarray]:
        by_cluster: dict[str, list[DiarizationTurn]] = defaultdict(list)
        for turn in turns:
            cluster_id = turn.cluster_id or turn.speaker
            by_cluster[cluster_id].append(turn)

        embeddings: dict[str, np.ndarray] = {}
        for cluster_id, cluster_turns in by_cluster.items():
            eligible = [
                turn
                for turn in cluster_turns
                if turn.end_sec - turn.start_sec >= self.settings.speaker_min_enroll_seconds
            ]
            if not eligible:
                eligible = cluster_turns
            longest = max(eligible, key=lambda turn: turn.end_sec - turn.start_sec)
            embeddings[cluster_id] = self.extract_embedding(
                audio_path,
                longest.start_sec,
                longest.end_sec,
            )
        return embeddings


# Backward-compatible alias for diarization internals.
SpeakerEmbeddingService = VoiceprintEmbeddingService
