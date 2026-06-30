# Quickstart

Get the Finch backend running and transcribe your first audio file.

## Prerequisites

| Tool | Purpose |
|------|---------|
| [uv](https://docs.astral.sh/uv/) | Python package manager |
| [ffmpeg](https://ffmpeg.org/) | Audio normalization (16 kHz mono WAV) |
| [Node.js](https://nodejs.org/) 20+ | Frontend (optional) |

For real ASR (not mock mode), allow disk space and RAM for [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B).

## 1. Clone and configure

Copy [`.env.example`](../.env.example) to **repo root `.env`** or `backend/.env` (both are loaded):

```bash
cp .env.example .env
cd backend
uv sync
```

Default dev config uses mock ASR and mock diarization — no model downloads required.

## 2. Run the backend

```bash
uv run uvicorn app.main:app --reload
```

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
curl -X POST http://localhost:8000/api/transcripts \
  -H "Content-Type: application/json" \
  -d '{"audioAssetId": "audio_abc123", "language": "auto"}'
```

Returns `jobId` and `transcriptId`. A placeholder with `status: "transcribing"` appears immediately.

### Poll and read

```bash
curl http://localhost:8000/api/jobs/job_abc123
curl http://localhost:8000/api/transcripts/transcript_abc123
```

## 4. CLI script

With the server running:

```bash
cd backend
uv run python scripts/transcribe_file.py ../data/your-audio.mp3
```

Uploads, polls, prints the transcript, and saves `your-audio.txt` next to the source file.

## 5. Run the frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — **New** (Record / Upload), **Transcripts**, **Documents**, **Settings**. Home shows your most recently updated transcripts.

## 6. Real ASR

```bash
cd backend
uv add torch qwen-asr
```

In `.env`:

```env
ASR_MOCK=false
HF_HOME=./data/hf_cache
```

First run downloads the model from Hugging Face. On Apple Silicon, `ASR_DEVICE=auto` selects MPS when available.

## 7. Speaker diarization

See **[diarization.md](diarization.md)** for full setup. Summary:

```env
DIARIZATION_ENABLED=true
DIARIZATION_MOCK=false
HF_TOKEN=hf_...
```

Validate before transcribing:

```bash
cd backend
uv add pyannote-audio
uv run python scripts/validate_diarization.py
```

## 8. Speaker memory

Optional persistent speaker names via local voiceprints. Requires diarization.

```env
SPEAKER_MEMORY_ENABLED=true
SPEAKER_MEMORY_MOCK=false
```

In the UI: **Settings → Speaker memory** to enable and give consent. On a transcript, **click a speaker pill** on any turn to assign or update a name (voiceprints update from that turn when memory is enabled).

See **[speaker-memory.md](speaker-memory.md)** for full setup.

## 9. AI actions

```env
LLM_MOCK=false
OPENROUTER_API_KEY=sk-or-...
```

Run actions from the **AI** tab on a transcript detail page, or via `POST /api/ai-actions`.

## 10. Tests

```bash
cd backend
uv run pytest
```

Tests mock ffmpeg and use `ASR_MOCK` / `DIARIZATION_MOCK` — no model download required.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `403` / `gated repo` (diarization) | Accept [pyannote model terms](https://huggingface.co/pyannote/speaker-diarization-community-1); same HF account as `HF_TOKEN` |
| `ffmpeg is not installed` | `brew install ffmpeg` (macOS) |
| No speaker labels | Run `uv run python scripts/validate_diarization.py` |
| Speaker names not saving | Click the speaker pill on a turn — names save immediately; enable speaker memory in Settings for voiceprints |
| Slow long audio | Expected on CPU/MPS; ASR chunks ~45s segments |
| Failed transcript visible | By design — check `errorMessage`, fix issue, re-transcribe |
