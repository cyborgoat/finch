# Backend Modules

Reference for the `backend/app/` package.

## Package map

```txt
backend/app/
  main.py              # FastAPI app, CORS, lifespan, routers
  config.py            # pydantic-settings (backend/.env + repo root .env)

  api/                 # HTTP routes, router.py aggregator, deps.py
  capabilities/        # Startup diagnostics, capability checks, error guidance
  core/                # Shared utilities (errors, ids, enums, logging)
  domains/             # Domain-oriented business logic
    transcription/     # ASR, diarization, pipeline
    voiceprint/        # Embedding, matching, profiles
    recordings/        # Recording CRUD, speakers, transcript text
    media/             # Audio upload/normalization
    jobs/              # Job lifecycle + queue (Huey)
    ai/                # LLM adapters, AI actions, pipelines
    settings/          # JSON preference store + settings services
  models/              # SQLModel tables
  schemas/             # Pydantic request/response DTOs (camelCase JSON)
  prompts/             # LLM prompt templates (Markdown)
  storage/             # Database + filesystem helpers
  workers/             # Thin background job entrypoints
```

Import from `app.domains.*` for business logic and `app.api.*` for HTTP handlers.

## `config.py`

Loads settings from `backend/.env` and repo root `.env`.

| Setting | Default | Notes |
|---------|---------|-------|
| `asr_model_id` | `Qwen/Qwen3-ASR-1.7B` | HF repo or local path |
| `diarization_enabled` | `false` | Speaker labels via pyannote (fallback; prefer Settings → Transcription) |
| `diarization_use_exclusive` | `true` | pyannote exclusive diarization (recommended) |
| `diarization_min_segment_seconds` | `0.3` | Drop merged segments shorter than this |
| `diarization_merge_gap_seconds` | `0.5` | Merge same-speaker turns within this gap |
| `diarization_max_segments` | `0` | Cap segments (`0` = unlimited) |
| `voiceprint_profiles_enabled` | `false` | Voiceprint profiles (fallback; prefer Settings → Transcription) |
| `speaker_embedding_model_id` | `pyannote/embedding` | Voiceprint model |
| `speaker_min_enroll_seconds` | `2.0` | Min speech for enrollment sample |
| `speaker_match_threshold` | `0.75` | Cosine similarity threshold for auto-match |
| `hf_token` | — | Hugging Face token for gated pyannote models — set `HF_TOKEN` in `.env` only (not in Settings UI) |
| `huey_db_path` | `{data_dir}/huey.db` | SQLite-backed job queue database |

LLM and transcription toggles are stored in SQLite via the frontend — not in `.env`. `HF_TOKEN` is read from `.env` only.

## `api/`

| Module | Routes |
|--------|--------|
| `router.py` | Aggregates all route modules under `/api` |
| `deps.py` | FastAPI dependency factories for domain services |
| `routes_health.py` | `GET /api/health` (includes capability flags) |
| `routes_audio.py` | `POST /api/audio/upload`, `GET /api/audio/{id}/stream`, `GET/DELETE /api/audio/{id}` |
| `routes_recordings.py` | CRUD + `POST /api/recordings` + `PATCH /api/recordings/{id}/speakers` |
| `routes_jobs.py` | `GET /api/jobs/{id}` |
| `routes_ai_actions.py` | `POST /api/ai-actions`, `GET /api/ai-actions/templates` |
| `routes_notes.py` | `GET/POST/PATCH/DELETE /api/notes` |
| `routes_voiceprint_profiles.py` | Voiceprint profiles + consent/status helpers |
| `routes_user_settings.py` | `GET/PATCH /api/user-settings` |
| `routes_llm_settings.py` | `GET/PATCH /api/llm-settings` (local SQLite storage) |
| `routes_transcription_settings.py` | `GET/PATCH /api/transcription-settings` (diarization, voiceprint toggles) |

## `capabilities/`

| Module | Role |
|--------|------|
| `checker.py` | Dependency probes (ffmpeg, torch, pyannote, etc.) |
| `status.py` | Capability flags for health + settings |
| `error_catalog.py` | User-facing error remediation hints |
| `startup.py` | Startup banner logging |

## `domains/`

| Domain | Key modules |
|--------|-------------|
| `transcription/` | `asr_service`, `diarization_service`, `pipeline`, `types` |
| `voiceprint/` | `embedding_service`, `matching_service`, `profile_service` |
| `recordings/` | `recording_service`, `speaker_service`, `transcript_text_service` |
| `media/` | `audio_service` |
| `jobs/` | `job_service`, `queue` (Huey) |
| `ai/` | `action_service`, `presets`, `prompt_context`, `pipeline`, `llm/` |
| `settings/` | `preference_store`, `*_settings_service`, `app_preference_service` |

## `workers/`

| Worker | Flow |
|--------|------|
| `transcription_worker.py` | Delegates to `TranscriptionPipeline` |
| `ai_action_worker.py` | Delegates to `AiActionPipeline` |

Run the Huey consumer alongside uvicorn:

```bash
uv run huey_consumer app.domains.jobs.queue.huey -w 1
```

## `storage/database.py`

- Alembic migrations on startup (`alembic upgrade head`)
- Test helper `reset_engine()` uses `create_all` for isolated DB fixtures

## `tests/`

87 tests covering health, upload, recordings, diarization, voiceprint, settings, AI actions, notes, LLM providers, DB migration, startup diagnostics, preference store, and job queue.

## `scripts/`

| Script | Purpose |
|--------|----------|
| `transcribe_file.py` | CLI: upload → job → poll → print + save `.txt` |
| `validate_diarization.py` | Pre-flight diarization checks; optional `--audio` probe |
