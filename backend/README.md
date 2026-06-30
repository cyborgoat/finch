# Finch Backend

Local ASR transcription API for Finch — optional speaker diarization and OpenRouter AI actions.

**Project docs:** [../docs/README.md](../docs/README.md) · **Diarization:** [../docs/diarization.md](../docs/diarization.md)

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- [ffmpeg](https://ffmpeg.org/) on your PATH (required for audio normalization)

## Setup

Configuration is loaded from **`backend/.env`** and/or **repo root `.env`** (root file is convenient when running uvicorn from `backend/`).

```bash
cd backend
cp .env.example .env   # or: cp ../.env.example ../.env
uv sync
```

## Run

```bash
uv run uvicorn app.main:app --reload
```

On startup, the terminal prints a **configuration summary**: loaded env files, ASR/diarization/LLM mode, dependency checks, and fix hints when something is missing (`app/core/startup_diagnostics.py`).

API docs: http://localhost:8000/docs

## Tests

```bash
uv run pytest
```

27 tests; mock `ffmpeg`, `ASR_MOCK`, and `DIARIZATION_MOCK` by default in the test suite.

## Environment

| Variable | Description |
|----------|-------------|
| `ASR_MOCK` | When `true`, returns a mock transcript without loading Qwen3-ASR |
| `LLM_MOCK` | When `true`, returns mock Markdown without OpenRouter |
| `DIARIZATION_ENABLED` | Enable speaker diarization in transcription jobs |
| `DIARIZATION_MOCK` | Mock diarization segments (no pyannote download) |
| `DIARIZATION_USE_ORIGINAL_AUDIO` | Diarize original upload instead of normalized WAV |
| `DIARIZATION_USE_EXCLUSIVE` | Use pyannote exclusive diarization (recommended for ASR) |
| `DIARIZATION_MIN_SEGMENT_SECONDS` | Drop segments shorter than this after merge (default `0.3`) |
| `DIARIZATION_MERGE_GAP_SECONDS` | Merge same-speaker turns within this gap (default `0.5`) |
| `DIARIZATION_MAX_SEGMENTS` | Cap segment count (`0` = unlimited) |
| `HF_TOKEN` | Hugging Face token for pyannote gated models (or use `huggingface-cli login`) |
| `DATABASE_URL` | SQLite connection string |
| `MAX_UPLOAD_MB` | Maximum upload size in megabytes |

See [`.env.example`](.env.example) and [../.env.example](../.env.example) for the full list.

## Real ASR

To use Qwen3-ASR-1.7B locally:

```bash
uv add torch qwen-asr
```

Set in `.env`:

```env
ASR_MOCK=false
HF_HOME=./data/hf_cache
```

The model is loaded lazily on the first transcription request.

## Speaker diarization

Requires `DIARIZATION_ENABLED=true`, `uv add pyannote-audio`, and Hugging Face access to [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1). See [../docs/diarization.md](../docs/diarization.md).

Validate setup:

```bash
uv run python scripts/validate_diarization.py
uv run python scripts/validate_diarization.py --audio path/to/sample.wav
```

If diarization is unavailable, the worker falls back to full-file ASR and stores a `processingNote` on the transcript.

## API

- `GET /api/health` — liveness + capability flags (`asrMock`, `diarizationReady`, `llmMock`, etc.)
- `POST /api/audio/upload`
- `GET /api/audio/{id}` · `DELETE /api/audio/{id}`
- `POST /api/transcripts` — returns `jobId` + `transcriptId` (placeholder with `status=transcribing`)
- `GET /api/transcripts` · `GET/PATCH/DELETE /api/transcripts/{id}`
- `GET /api/jobs/{id}`
- `GET /api/ai-actions/templates` · `POST /api/ai-actions`
- `GET /api/documents` · `GET/PATCH/DELETE /api/documents/{id}`

Transcripts may include `speakerSegments`, `processingNote`, or `errorMessage` when diarization is skipped or a job fails.
