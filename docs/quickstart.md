# Quickstart

Get the Finch backend running and transcribe your first audio file.

## Prerequisites

| Tool | Purpose |
|------|---------|
| [uv](https://docs.astral.sh/uv/) | Python package manager |
| [ffmpeg](https://ffmpeg.org/) | Audio normalization (16 kHz mono WAV) |
| [Node.js](https://nodejs.org/) 20+ | Frontend (optional) |

For local ASR, allow disk space and RAM for [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B).

## 1. Clone and configure

Copy [`.env.example`](../.env.example) to **repo root `.env`** or `backend/.env` (both are loaded):

```bash
cp .env.example .env
cd backend
uv sync
uv add torch qwen-asr
```

Diarization and voiceprint profiles are off by default. Enable toggles in **Settings → Transcription** after starting the frontend, or set `DIARIZATION_ENABLED` / `VOICEPRINT_PROFILES_ENABLED` in `.env` as fallbacks. Set `HF_TOKEN` in `.env` when using diarization or voiceprints.

## 2. Run the backend

Start the API and job worker in separate terminals:

```bash
# Terminal 1 — API server
uv run uvicorn app.main:app --reload

# Terminal 2 — background job worker (transcription + AI actions)
uv run huey_consumer app.domains.jobs.queue.huey -w 1
```

The worker uses a SQLite-backed Huey queue (`data/huey.db` by default) so jobs survive API restarts.

Verify:

```bash
curl http://localhost:8000/api/health
```

On startup, the terminal prints a **configuration summary**: loaded `.env` files, ASR/diarization/LLM mode, dependency checks, and fix hints.

API docs: http://localhost:8000/docs

## 3. Transcribe via API

### Upload audio

```bash
curl -F "file=@../data/your-audio.mp3" -F "source=upload" \
  http://localhost:8000/api/audio/upload
```

### Start transcription job

```bash
curl -X POST http://localhost:8000/api/recordings \
  -H "Content-Type: application/json" \
  -d '{"audioAssetId": "audio_abc123", "language": "auto"}'
```

Returns `jobId` and `recordingId` (e.g. `recording_a1b2c3d4e5f67890`). A placeholder with `status: "transcribing"` appears immediately.

### Poll and read

```bash
curl http://localhost:8000/api/jobs/job_abc123
curl http://localhost:8000/api/recordings/recording_abc123def4567890
```

## 4. CLI script

With the server running:

```bash
cd backend
uv run python scripts/transcribe_file.py ../data/your-audio.mp3
```

Uploads, polls, prints the transcript, and saves `your-audio.txt` next to the source file.

## 5. Run the frontend

The frontend requires the **API server** (step 2, terminal 1) to be running. Start the **Huey consumer** (terminal 2) before transcribing or generating AI notes.

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — **New** (Record / Upload), **Recordings**, **Settings**.

- **Home** and **Recordings** list voice recordings only.
- Open a recording for the **Source** (transcript) and **Notes** (AI templates + blank notes) tabs.
- Recording URLs use the `recording_` prefix: `/recordings/recording_…`. Notes open on the **Notes** tab (`?tab=notes&noteId=…`).

If you have an old local database, delete `backend/finch.db` and restart the backend — Alembic recreates the schema on startup.

## 6. ASR

ASR dependencies are installed in step 1. Optional cache path in `.env`:

```env
HF_HOME=./data/hf_cache
```

First run downloads the model from Hugging Face. On Apple Silicon, `ASR_DEVICE=auto` selects MPS when available.

## 7. Speaker diarization

See **[diarization.md](diarization.md)** for full setup. Summary:

Set `HF_TOKEN` in `.env`, then enable in **Settings → Transcription** (or set fallbacks in `.env`):

```env
HF_TOKEN=hf_...
DIARIZATION_ENABLED=true
```

Validate before transcribing:

```bash
cd backend
uv add pyannote-audio
uv run python scripts/validate_diarization.py
```

## 8. Voiceprint profiles

Optional persistent speaker names via local voiceprints. Requires diarization.

In the UI: **Settings → Voiceprint profiles → Auto-label speaker names** (consent on first enable). On a transcript, **click a speaker name** on any turn to assign or update a label (voiceprints update from that turn when auto-label is on).

See **[voiceprint-profiles.md](voiceprint-profiles.md)** for full setup.

## 9. AI notes

Configure your LLM provider in the frontend: **Settings → LLM provider**.

Supported providers:

- **OpenRouter** (default) — API key + optional base URL/model override
- **OpenAI** — API key + optional base URL/model override
- **Anthropic** — API key + optional base URL/model override
- **Custom** — local OpenAI-compatible servers (Ollama, LM Studio, vLLM): base URL + model name; API key optional

Credentials are stored locally in the Finch SQLite database. The API never returns saved API keys — only an `apiKeyConfigured` flag.

Create notes from the **Notes** tab on a recording detail page (`/recordings/{id}?tab=notes`), or via the API:

- `GET /api/ai-actions/templates` — list AI note templates
- `POST /api/ai-actions` — generate a note (`action`: `meeting_summary`, `action_items`, `key_decisions`, `follow_up_email`)
- `POST /api/notes` — create a blank manual note

User language and summarization preferences from **Settings** are applied to meeting summary prompts automatically.

## 10. Tests

```bash
cd backend
uv run pytest
```

Tests patch external services (ffmpeg, ASR, diarization, LLM) at test time — no model downloads required.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend 500 / `ERR_CONNECTION_REFUSED` on `:8000` | Start the API: `cd backend && uv run uvicorn app.main:app --reload` |
| Transcription stuck at `queued` | Start the Huey consumer: `uv run huey_consumer app.domains.jobs.queue.huey -w 1` |
| Huey `TaskRegistry` errors | Restart the consumer after pulling updates; stale queue entries may need `rm data/huey.db` |
| `403` / `gated repo` (diarization) | Accept [pyannote model terms](https://huggingface.co/pyannote/speaker-diarization-community-1); same HF account as `HF_TOKEN` |
| `ffmpeg is not installed` | `brew install ffmpeg` (macOS) |
| No speaker labels | Run `uv run python scripts/validate_diarization.py` |
| Speaker names not saving | Click the speaker name on a turn — labels save immediately; enable auto-label in **Settings → Voiceprint profiles** for voiceprints |
| Slow long audio | Expected on CPU/MPS; ASR chunks ~45s segments |
| Failed transcript visible | By design — check `errorMessage`, fix issue, re-transcribe |
