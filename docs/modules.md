# Backend Modules

Reference for the `backend/app/` package. Backend milestones 1–3 are complete; the Next.js frontend (milestones 4–7) lives in `frontend/`.

## Package map

```txt
backend/app/
  main.py              # FastAPI app, CORS, lifespan, routers
  config.py            # pydantic-settings (env vars)

  api/                 # HTTP routes
  core/                # Shared utilities
  models/              # SQLModel tables
  schemas/             # Pydantic request/response DTOs (camelCase JSON)
  services/            # Business logic
  storage/             # Database + filesystem helpers
  workers/             # Background job handlers
```

## `config.py`

Loads settings from `backend/.env` via `pydantic-settings`.

Important fields:

| Setting | Default | Notes |
|---------|---------|-------|
| `asr_mock` | `true` in `.env.example` | Skip model load when true |
| `asr_model_id` | `Qwen/Qwen3-ASR-1.7B` | HF repo or local path |
| `asr_device` | `auto` | cuda → mps → cpu |
| `max_upload_mb` | `500` | Upload size limit |
| `max_audio_duration_seconds` | `7200` | 2 hours |

## `api/`

| Module | Routes |
|--------|--------|
| `routes_health.py` | `GET /api/health` |
| `routes_audio.py` | `POST /api/audio/upload`, `GET/DELETE /api/audio/{id}` |
| `routes_transcripts.py` | CRUD + `POST /api/transcripts` (starts job) |
| `routes_jobs.py` | `GET /api/jobs/{id}` |

Routes are thin: validate input, call services, return schemas.

## `core/`

| Module | Role |
|--------|------|
| `errors.py` | `AppError` + JSON error handler |
| `ids.py` | Prefixed IDs: `audio_`, `transcript_`, `job_` |
| `logging.py` | stdout logging setup |

## `models/`

SQLModel table definitions:

| Model | Key fields |
|-------|------------|
| `AudioAsset` | `source`, `filename`, `mime_type`, `original_path`, `normalized_path` |
| `Transcript` | `audio_asset_id`, `raw_text`, `edited_text`, `status` |
| `Job` | `type`, `status`, `progress`, `stage`, `result_id`, `error` |

`Document` model is not created yet (Milestone 8).

## `schemas/`

Pydantic models with camelCase aliases for JSON (`mimeType`, `audioAssetId`, etc.).

Shared base: `CamelModel` in `schemas/__init__.py` using `alias_generator=to_camel`.

## `services/`

### `audio_service.py`

- Validates MIME type (strips codec parameters, e.g. `audio/webm;codecs=opus` → `audio/webm`) and file size
- Saves originals under `data/audio/original/{id}.{ext}`
- Normalizes via ffmpeg to 16 kHz mono WAV
- Extracts duration with librosa
- Deletes files + DB record

### `asr_service.py`

- **Mock mode:** returns fixed placeholder text
- **Real mode:** lazy-loads `Qwen3ASRModel` from `qwen-asr`
- **Chunking:** audio >60s split into 45s segments; prints each chunk transcript to stdout/logger
- Optional `on_chunk` callback for job progress updates

### `job_service.py`

Creates and updates `Job` records (`queued` → `processing` → `completed`/`failed`).

### `transcript_service.py`

CRUD for transcripts. `create_transcript` accepts an optional `status` (used for `transcribing` placeholders). List endpoint omits full text fields (summary only).

## `storage/`

### `database.py`

- SQLModel engine via `get_engine()` (supports test DB reset)
- `create_db_and_tables()` on app startup
- `get_session()` FastAPI dependency

### `file_store.py`

- Ensures data directories exist
- `safe_join()` prevents path traversal

## `workers/`

### `transcription_worker.py`

Runs in FastAPI `BackgroundTasks` after `POST /api/transcripts`:

1. `loading_model` — `AsrService.load_model()`
2. `running_asr` — transcribe normalized path (chunk progress in stage name)
3. `saving_transcript` — update placeholder `Transcript` with `rawText`, set `status=draft`

On failure, deletes the placeholder transcript. Uses a fresh DB session via `get_engine()` (not the request session).

## `scripts/`

| Script | Purpose |
|--------|---------|
| `transcribe_file.py` | CLI: upload → job → poll → print + save `.txt` |

## `tests/`

| File | Covers |
|------|--------|
| `test_health.py` | Health endpoint |
| `test_audio_upload.py` | Upload validation + storage (mocked ffmpeg) |
| `test_transcript_api.py` | End-to-end upload → job → transcript; transcribing placeholder (mocked ASR) |

Fixtures: `tests/fixtures/sample.wav`, `conftest.py` with temp DB and dirs.

## Extension points (next milestones)

| Milestone | Modules to add |
|-----------|----------------|
| 8 AI actions | `models/document.py`, `services/llm_service.py`, `services/ai_action_service.py`, `workers/ai_action_worker.py`, `prompts/*.md` |
| 9 Documents | Document routes + frontend editor pages |
| 10 Polish | Motion UI, full settings, empty-state illustrations |
