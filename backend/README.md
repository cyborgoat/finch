# Finch Backend

Local ASR transcription API for Finch — optional speaker diarization, voiceprint profiles, and configurable LLM AI actions.

**Project docs:** [../docs/README.md](../docs/README.md) · **Diarization:** [../docs/diarization.md](../docs/diarization.md) · **Voiceprint profiles:** [../docs/voiceprint-profiles.md](../docs/voiceprint-profiles.md)

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

Debug voiceprint matching with verbose logs:

```bash
DEBUG_MODE=true uv run uvicorn app.main:app --reload
# or
uv run dev-debug
```

On startup, the terminal prints a **configuration summary**: loaded env files, ASR/diarization/voiceprint/LLM mode, dependency checks, and fix hints (`app/core/startup_diagnostics.py`).

API docs: http://localhost:8000/docs

## Tests

```bash
uv run pytest
```

79 tests; patch `ffmpeg`, ASR, diarization, and LLM services at test time — no model downloads required.

## Environment

| Variable | Description |
|----------|-------------|
| `DEBUG_MODE` | Verbose voiceprint/diarization logs at DEBUG level (default `false`) |
| `HF_TOKEN` | Hugging Face token for pyannote gated models — set in `.env` only |
| `DIARIZATION_ENABLED` | Fallback for speaker diarization toggle (prefer **Settings → Transcription**) |
| `SPEAKER_MEMORY_ENABLED` | Fallback for voiceprint profiles toggle (prefer **Settings → Transcription**) |
| `SPEAKER_EMBEDDING_MODEL_ID` | Embedding model (default `pyannote/embedding`) |
| `SPEAKER_MATCH_THRESHOLD` | Cosine similarity threshold for auto-match (default `0.65`) |
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

Requires pyannote-audio and Hugging Face access to [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1). Set `HF_TOKEN` in `.env` and enable in **Settings → Transcription** (or `DIARIZATION_ENABLED=true` as fallback). See [../docs/diarization.md](../docs/diarization.md).

Validate setup:

```bash
uv run python scripts/validate_diarization.py
uv run python scripts/validate_diarization.py --audio path/to/sample.wav
```

## Voiceprint profiles

Optional local voiceprint storage for persistent speaker names. Requires diarization. Enable in **Settings → Transcription** or set `SPEAKER_MEMORY_ENABLED=true` in `.env` as a fallback. See [../docs/voiceprint-profiles.md](../docs/voiceprint-profiles.md).

If diarization or speaker matching is unavailable, the worker falls back gracefully and stores a `processingNote` when relevant.

## API

- `GET /api/health` — liveness + capability flags
- `POST /api/audio/upload` · `GET /api/audio/{id}/stream` · `GET/DELETE /api/audio/{id}`
- `POST /api/recordings` — start transcription job
- `GET/PATCH/DELETE /api/recordings/{id}`
- `PATCH /api/recordings/{id}/speakers` — rename/link speakers on a transcript
- `GET /api/jobs/{id}`
- `POST /api/ai-actions` — generate AI note (`action`: `meeting_summary`, `action_items`, `key_decisions`, `follow_up_email`; legacy alias `markdown_summary`)
- `GET /api/ai-actions/templates` — list AI note templates
- `GET/POST/PATCH/DELETE /api/notes` — note CRUD (POST creates blank manual notes)
- `GET/PATCH /api/transcription-settings` — diarization and voiceprint profile toggles (SQLite)
- `GET/POST/PATCH/DELETE /api/voiceprint-profiles` · `GET /api/voiceprint-profiles/{id}`
- `GET/PATCH/DELETE /api/voiceprint-profiles/status` · `POST /api/voiceprint-profiles/consent` · `DELETE /api/voiceprint-profiles/data`
- `GET/PATCH /api/user-settings` — user name, ui/content language, summarization prefs, linked voiceprint profile
- `GET/PATCH /api/llm-settings` — LLM provider credentials (stored locally in SQLite; API keys never returned)

Transcripts may include `speakerSegments`, `processingNote`, or `errorMessage` when diarization is skipped or a job fails.
