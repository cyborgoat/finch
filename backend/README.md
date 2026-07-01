# Finch Backend

Local ASR transcription API for Finch — optional speaker diarization, speaker memory, and configurable LLM AI actions.

**Project docs:** [../docs/README.md](../docs/README.md) · **Diarization:** [../docs/diarization.md](../docs/diarization.md) · **Speaker memory:** [../docs/speaker-memory.md](../docs/speaker-memory.md)

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

On startup, the terminal prints a **configuration summary**: loaded env files, ASR/diarization/speaker memory/LLM mode, dependency checks, and fix hints (`app/core/startup_diagnostics.py`).

API docs: http://localhost:8000/docs

## Tests

```bash
uv run pytest
```

57 tests; patch `ffmpeg`, ASR, diarization, and LLM services at test time — no model downloads required.

## Environment

| Variable | Description |
|----------|-------------|
| `DIARIZATION_ENABLED` | Enable speaker diarization in transcription jobs |
| `DIARIZATION_USE_ORIGINAL_AUDIO` | Diarize original upload instead of normalized WAV |
| `DIARIZATION_USE_EXCLUSIVE` | Use pyannote exclusive diarization (recommended for ASR) |
| `DIARIZATION_MIN_SEGMENT_SECONDS` | Drop segments shorter than this after merge (default `0.3`) |
| `DIARIZATION_MERGE_GAP_SECONDS` | Merge same-speaker turns within this gap (default `0.5`) |
| `DIARIZATION_MAX_SEGMENTS` | Cap segment count (`0` = unlimited) |
| `HF_TOKEN` | Hugging Face token for pyannote gated models (or use `huggingface-cli login`) |
| `SPEAKER_MEMORY_ENABLED` | Remember speaker names across transcripts |
| `SPEAKER_EMBEDDING_MODEL_ID` | Embedding model (default `pyannote/embedding`) |
| `SPEAKER_MATCH_THRESHOLD` | Cosine similarity threshold for auto-match (default `0.75`) |
| `SPEAKER_MIN_ENROLL_SECONDS` | Min speech duration for enrollment samples (default `2.0`) |
| `DATABASE_URL` | SQLite connection string |
| `MAX_UPLOAD_MB` | Maximum upload size in megabytes |

See [`.env.example`](.env.example) and [../.env.example](../.env.example) for the full list.

## ASR

Local transcription uses Qwen3-ASR-1.7B:

```bash
uv add torch qwen-asr
```

Optional in `.env`:

```env
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

## Speaker memory

Optional local voiceprint storage for persistent speaker names. Requires diarization. See [../docs/speaker-memory.md](../docs/speaker-memory.md).

If diarization or speaker matching is unavailable, the worker falls back gracefully and stores a `processingNote` when relevant.

## API

- `GET /api/health` — liveness + capability flags
- `POST /api/audio/upload` · `GET /api/audio/{id}/stream` · `GET/DELETE /api/audio/{id}`
- `POST /api/transcripts` — start transcription job
- `GET/PATCH/DELETE /api/transcripts/{id}`
- `PATCH /api/transcripts/{id}/speakers` — rename/link speakers on a transcript
- `GET /api/jobs/{id}`
- `POST /api/ai-actions` — generate AI note (`action`: `meeting_summary`, `action_items`, `key_decisions`, `follow_up_email`; legacy alias `markdown_summary`)
- `GET /api/ai-actions/templates` — list AI note templates
- `GET/POST/PATCH/DELETE /api/documents` — document CRUD (POST creates blank manual notes)
- `GET/POST/PATCH/DELETE /api/speaker-profiles` · `GET /api/speaker-profiles/{id}`
- `GET/PATCH/DELETE /api/speaker-memory/status` · `POST /api/speaker-memory/consent` · `DELETE /api/speaker-memory/data`
- `GET/PATCH /api/user-settings` — user name, ui/content language, summarization prefs, linked speaker profile
- `GET/PATCH /api/llm-settings` — LLM provider credentials (stored locally in SQLite; API keys never returned)

Transcripts may include `speakerSegments`, `processingNote`, or `errorMessage` when diarization is skipped or a job fails.
