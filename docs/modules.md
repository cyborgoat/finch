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
| `asr_mock` | `true` in `.env.example` | Skip model load when true |
| `asr_model_id` | `Qwen/Qwen3-ASR-1.7B` | HF repo or local path |
| `diarization_enabled` | `false` | Speaker labels via pyannote |
| `diarization_mock` | `true` | Fake two-speaker segments for CI |
| `diarization_use_exclusive` | `true` | pyannote exclusive diarization (recommended) |
| `diarization_min_segment_seconds` | `0.3` | Drop merged segments shorter than this |
| `diarization_merge_gap_seconds` | `0.5` | Merge same-speaker turns within this gap |
| `diarization_max_segments` | `0` | Cap segments (`0` = unlimited) |
| `speaker_memory_enabled` | `false` | Remember speaker names across transcripts |
| `speaker_memory_mock` | `true` | Mock embeddings for CI |
| `speaker_embedding_model_id` | `pyannote/embedding` | Voiceprint model |
| `speaker_min_enroll_seconds` | `2.0` | Min speech for enrollment sample |
| `speaker_match_threshold` | `0.75` | Cosine similarity threshold for auto-match |
| `hf_token` | — | Hugging Face token for gated pyannote models |
| `llm_mock` | `true` | Mock AI action output |
| `openrouter_api_key` | — | Required when `LLM_MOCK=false` |

## `api/`

| Module | Routes |
|--------|--------|
| `routes_health.py` | `GET /api/health` (includes capability flags) |
| `routes_audio.py` | `POST /api/audio/upload`, `GET/DELETE /api/audio/{id}` |
| `routes_transcripts.py` | CRUD + `POST /api/transcripts` + `PATCH /api/transcripts/{id}/speakers` |
| `routes_jobs.py` | `GET /api/jobs/{id}` |
| `routes_ai_actions.py` | Templates + `POST /api/ai-actions` |
| `routes_documents.py` | Document CRUD |
| `routes_speaker_profiles.py` | Speaker profiles + speaker memory status/consent |

## `core/`

| Module | Role |
|--------|------|
| `errors.py` | `AppError` + JSON error handler |
| `ids.py` | Prefixed IDs: `audio_`, `transcript_`, `job_`, `document_`, `speaker_`, `semb_` |
| `logging.py` | stdout logging setup |
| `startup_diagnostics.py` | Startup config summary, dependency checks, error remediation hints |

## `models/`

| Model | Key fields |
|-------|------------|
| `AudioAsset` | `source`, `filename`, `mime_type`, `original_path`, `normalized_path` |
| `Transcript` | `raw_text`, `edited_text`, `speaker_segments`, `error_message`, `processing_note`, `status` |
| `SpeakerProfile` | `display_name`, `notes` |
| `SpeakerEmbedding` | `embedding` JSON vector, `model_id`, source transcript/cluster |
| `AppPreference` | Key/value store (speaker memory consent, enabled toggle) |
| `Job` | `type`, `status`, `progress`, `stage`, `result_id`, `error` |
| `Document` | `transcript_id`, `markdown`, `type`, `model` |

## `services/`

| Service | Role |
|---------|------|
| `audio_service.py` | Upload validation, ffmpeg normalization, duration |
| `asr_service.py` | Qwen3-ASR (mock or real), chunking for long audio |
| `diarization_service.py` | pyannote speaker diarization, segment slicing, labeled transcript builder |
| `speaker_embedding_service.py` | pyannote/embedding extraction (mock or real) |
| `speaker_profile_service.py` | Profile CRUD, enrollment, centroid computation |
| `speaker_matching_service.py` | Cosine match embeddings → display names |
| `speaker_transcript_service.py` | Speaker rename on transcripts; optional turn-scoped voiceprint enrollment |
| `app_preference_service.py` | Speaker memory consent and enable toggle |
| `transcript_service.py` | Transcript CRUD |
| `document_service.py` | Document CRUD |
| `llm_service.py` | OpenRouter chat completions (mock or real) |
| `ai_action_service.py` | Prompt templates + document generation |
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

35 tests covering health, upload, transcripts, diarization, speaker memory, AI actions, DB migration, and startup diagnostics.

## `scripts/`

| Script | Purpose |
|--------|---------|
| `transcribe_file.py` | CLI: upload → job → poll → print + save `.txt` |
| `validate_diarization.py` | Pre-flight diarization checks; optional `--audio` probe |
