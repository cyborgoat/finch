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
| `diarization_enabled` | `false` | Speaker labels via pyannote |
| `diarization_use_exclusive` | `true` | pyannote exclusive diarization (recommended) |
| `diarization_min_segment_seconds` | `0.3` | Drop merged segments shorter than this |
| `diarization_merge_gap_seconds` | `0.5` | Merge same-speaker turns within this gap |
| `diarization_max_segments` | `0` | Cap segments (`0` = unlimited) |
| `speaker_memory_enabled` | `false` | Remember speaker names across transcripts |
| `speaker_embedding_model_id` | `pyannote/embedding` | Voiceprint model |
| `speaker_min_enroll_seconds` | `2.0` | Min speech for enrollment sample |
| `speaker_match_threshold` | `0.75` | Cosine similarity threshold for auto-match |
| `hf_token` | — | Hugging Face token for gated pyannote models |

LLM provider settings (API keys, base URL, model) are stored in SQLite via **Settings → LLM provider** — not in `.env`. See `llm_settings_service.py` and `AppPreference` key `llm_settings`.

## `api/`

| Module | Routes |
|--------|--------|
| `routes_health.py` | `GET /api/health` (includes capability flags) |
| `routes_audio.py` | `POST /api/audio/upload`, `GET /api/audio/{id}/stream`, `GET/DELETE /api/audio/{id}` |
| `routes_transcripts.py` | CRUD + `POST /api/transcripts` + `PATCH /api/transcripts/{id}/speakers` |
| `routes_jobs.py` | `GET /api/jobs/{id}` |
| `routes_ai_actions.py` | `POST /api/ai-actions` (transcript summary) |
| `routes_documents.py` | Document CRUD |
| `routes_speaker_profiles.py` | Speaker profiles + speaker memory status/consent |
| `routes_user_settings.py` | `GET/PATCH /api/user-settings` |
| `routes_llm_settings.py` | `GET/PATCH /api/llm-settings` (local SQLite storage) |

## `core/`

| Module | Role |
|--------|------|
| `errors.py` | `AppError` + JSON error handler |
| `ids.py` | Prefixed IDs: `transcript_`, `doc_`, `audio_`, `job_`, `speaker_`, `semb_` |
| `logging.py` | stdout logging setup |
| `startup_diagnostics.py` | Startup config summary, dependency checks, error remediation hints |

## `models/`

| Model | Key fields |
|-------|------------|
| `AudioAsset` | `source`, `filename`, `mime_type`, `original_path`, `normalized_path` |
| `Transcript` | `raw_text`, `edited_text`, `speaker_segments`, `error_message`, `processing_note`, `status` |
| `SpeakerProfile` | `display_name`, `notes` |
| `SpeakerEmbedding` | `embedding` JSON vector, `model_id`, source transcript/cluster |
| `AppPreference` | Key/value store (speaker memory consent, auto-label toggle, `user_settings` JSON) |
| `Job` | `type`, `status`, `progress`, `stage`, `result_id`, `error` |
| `Document` | `transcript_id`, `markdown`, `type`, `model` |

## `services/`

| Service | Role |
|---------|------|
| `audio_service.py` | Upload validation, ffmpeg normalization, duration |
| `asr_service.py` | Qwen3-ASR, chunking for long audio |
| `diarization_service.py` | pyannote speaker diarization, segment slicing, labeled transcript builder |
| `speaker_embedding_service.py` | pyannote/embedding extraction |
| `speaker_profile_service.py` | Profile CRUD, enrollment, centroid computation |
| `speaker_matching_service.py` | Cosine match embeddings → display names |
| `speaker_transcript_service.py` | Speaker rename on transcripts; optional turn-scoped voiceprint enrollment |
| `app_preference_service.py` | Speaker memory consent and auto-label toggle |
| `user_settings_service.py` | User profile, language, summarization prefs, linked speaker |
| `transcript_service.py` | Transcript CRUD |
| `document_service.py` | Document CRUD |
| `llm_service.py` | LLM facade (configured provider) |
| `llm/` | Provider adapters: OpenAI-compatible, Anthropic, factory, presets |
| `llm_settings_service.py` | LLM provider settings in SQLite (`AppPreference`) |
| `prompt_context.py` | User preference block injected into summary prompts |
| `ai_action_service.py` | Transcript summary prompt + LLM call |
| `job_service.py` | Job lifecycle |

## `workers/`

| Worker | Flow |
|--------|------|
| `transcription_worker.py` | Optional diarization → per-segment or full-file ASR → save transcript |
| `ai_action_worker.py` | Load transcript → LLM → save document |

Failed transcription jobs keep the transcript with `status=failed` and `errorMessage`.

## `storage/database.py`

- Creates tables on startup
- SQLite column patches for schema upgrades (`speaker_segments`, `error_message`, `processing_note`)

## `tests/`

57 tests covering health, upload, transcripts, diarization, speaker memory, user settings, AI actions, LLM providers, DB migration, and startup diagnostics. Tests patch external services (ffmpeg, ASR, diarization, LLM) at test time.

## `scripts/`

| Script | Purpose |
|--------|---------|
| `transcribe_file.py` | CLI: upload → job → poll → print + save `.txt` |
| `validate_diarization.py` | Pre-flight diarization checks; optional `--audio` probe |
