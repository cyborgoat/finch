# Finch Backend

FastAPI service for transcription, optional speaker diarization and voiceprints, and LLM note generation.

For setup and running, see the [Quickstart](../docs/quickstart.md). This page covers backend-specific details.

## Run

Two processes are required (the frontend is a third):

```bash
uv sync

# Terminal 1: API (http://localhost:8000, docs at /docs)
uv run uvicorn app.main:app --reload

# Terminal 2: worker. Without it, jobs stay "Queued"
uv run huey_consumer app.domains.jobs.queue.huey -w 1
```

On startup the API prints a configuration summary: which `.env` files loaded, which features are on, and hints for anything missing. Set `DEBUG_MODE=true` for verbose logs.

## Configuration

Copy `.env.example` to `backend/.env` or the repo root `.env` (both are read). The defaults work as-is. Variables you're most likely to change:

| Variable | Purpose |
|----------|---------|
| `HF_TOKEN` | Hugging Face token, needed for diarization and voiceprints |
| `MAX_UPLOAD_MB` | Upload size limit (default 500) |
| `ASR_DEVICE` | `auto`, `cpu`, `cuda`, or `mps` |
| `HF_HOME` | Where models are cached |
| `HUEY_DB_PATH` | Job queue file (default `data/huey.db`) |

Diarization and voiceprint toggles live in the app's **Settings → Transcription**; `.env` values are only fallbacks. LLM credentials are set in **Settings → LLM provider**, not `.env`. See `.env.example` for every option.

## Database

SQLite, managed by Alembic. Migrations run automatically on API startup. If the database is corrupted, delete `finch.db` and restart.

## Tests

```bash
uv run pytest
```

External services are mocked, so no model downloads are needed.

## API

Full interactive reference: http://localhost:8000/docs. Main endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/audio/upload` | Upload an audio file |
| `POST /api/recordings` | Start a transcription job |
| `GET /api/jobs/{id}` | Job status and progress |
| `GET/PATCH/DELETE /api/recordings/{id}` | Read, rename, delete a recording |
| `POST /api/ai-actions` | Generate an AI note |
| `/api/notes` | Note CRUD |
| `/api/transcription-settings`, `/api/user-settings`, `/api/llm-settings` | Settings |
| `/api/voiceprint-profiles` | Voiceprint profiles |
| `GET /api/health` | Liveness and feature flags |

## More

- [Backend module map](../docs/modules.md)
- [Diarization](../docs/diarization.md) · [Voiceprints](../docs/voiceprint-profiles.md)
