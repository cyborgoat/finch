# Backend Modules

Reference for the `backend/app/` package.

## Package map

```txt
backend/app/
  main.py              # FastAPI app, CORS, lifespan, routers
  config.py            # pydantic-settings (backend/.env + repo root .env)

  api/                 # HTTP routes
  core/                # Shared utilities + startup diagnostics
  models/              # SQLModel tables
  schemas/             # Pydantic request/response DTOs (camelCase JSON)
  services/            # Business logic
  prompts/             # LLM prompt templates (Markdown)
  storage/             # Database + filesystem helpers
  workers/             # Background job handlers
```

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
| `speaker_memory_enabled` | `false` | Voiceprint profiles (fallback; prefer Settings → Transcription) |
| `speaker_embedding_model_id` | `pyannote/embedding` | Voiceprint model |
| `speaker_min_enroll_seconds` | `2.0` | Min speech for enrollment sample |
| `speaker_match_threshold` | `0.75` | Cosine similarity threshold for auto-match |
| `hf_token` | — | Hugging Face token for gated pyannote models — set `HF_TOKEN` in `.env` only (not in Settings UI) |

LLM and transcription toggles are stored in SQLite via the frontend — not in `.env`. `HF_TOKEN` is read from `.env` only. See `llm_settings_service.py`, `transcription_settings_service.py`, and `AppPreference` keys `llm_settings` / `transcription_settings`.

## `api/`

| Module | Routes |
|--------|--------|
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

## `core/`

| Module | Role |
|--------|------|
| `errors.py` | `AppError` + JSON error handler |
| `ids.py` | Prefixed IDs: `recording_`, `note_`, `audio_`, `job_`, `voiceprint_`, `semb_` |
| `logging.py` | stdout logging setup |
| `startup_diagnostics.py` | Startup config summary, dependency checks, error remediation hints |

## `models/`

| Model | Key fields |
|-------|------------|
| `AudioAsset` | `source`, `filename`, `mime_type`, `original_path`, `normalized_path` |
| `Recording` | `raw_text`, `edited_text`, `speaker_segments`, `error_message`, `processing_note`, `status` |
| `VoiceprintProfile` | `display_name`, `notes` |
| `VoiceprintEmbedding` | `embedding` JSON vector, `model_id`, source transcript/cluster |
| `AppPreference` | Key/value store (transcription settings, voiceprint consent, auto-label toggle, `user_settings` JSON) |
| `Job` | `type`, `status`, `progress`, `stage`, `result_id`, `error` |
| `Note` | `recording_id`, `markdown`, `type`, `model` |

## `services/`

| Service | Role |
|---------|------|
| `audio_service.py` | Upload validation, ffmpeg normalization, duration |
| `asr_service.py` | Qwen3-ASR, chunking for long audio |
| `diarization_service.py` | pyannote speaker diarization, segment slicing, labeled transcript builder |
| `voiceprint_embedding_service.py` | pyannote/embedding extraction |
| `voiceprint_profile_service.py` | Profile CRUD, enrollment, centroid computation |
| `voiceprint_matching_service.py` | Cosine match embeddings → display names |
| `recording_speaker_service.py` | Speaker rename on transcripts; optional turn-scoped voiceprint enrollment |
| `app_preference_service.py` | Legacy preference helpers (prefer `TranscriptionSettingsService`) |
| `transcription_settings_service.py` | Diarization and voiceprint profile toggles (SQLite); reads `HF_TOKEN` from env |
| `user_settings_service.py` | User profile, language, summarization prefs, linked speaker |
| `recording_service.py` | Recording CRUD |
| `note_service.py` | Note CRUD |
| `llm_service.py` | LLM facade (configured provider) |
| `llm/` | Provider adapters: OpenAI-compatible, Anthropic, factory, presets |
| `llm_settings_service.py` | LLM provider settings in SQLite (`AppPreference`) |
| `prompt_context.py` | User preference block injected into summary prompts |
| `ai_action_presets.py` | AI note template registry (meeting summary, action items, etc.) |
| `ai_action_service.py` | AI note prompts + LLM dispatch |
| `job_service.py` | Job lifecycle |

## `workers/`

| Worker | Flow |
|--------|------|
| `transcription_worker.py` | Optional diarization → per-segment or full-file ASR → save transcript |
| `ai_action_worker.py` | Load transcript → LLM → save note |

Failed transcription jobs keep the recording with `status=failed` and `errorMessage`.

## `storage/database.py`

- Creates tables on startup
- SQLite column patches for schema upgrades (`speaker_segments`, `error_message`, `processing_note`)

## `tests/`

79 tests covering health, upload, recordings, diarization, voiceprint matching, voiceprint profiles, transcription settings, user settings, AI actions, notes, LLM providers, DB migration, and startup diagnostics. Tests patch external services (ffmpeg, ASR, diarization, LLM) at test time.

## `scripts/`

| Script | Purpose |
|--------|---------|
| `transcribe_file.py` | CLI: upload → job → poll → print + save `.txt` |
| `validate_diarization.py` | Pre-flight diarization checks; optional `--audio` probe |
