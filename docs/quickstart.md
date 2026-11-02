# Quickstart

From a fresh clone to your first transcript.

## 1. Install

You need [uv](https://docs.astral.sh/uv/), [ffmpeg](https://ffmpeg.org/) on your PATH, and [Node.js](https://nodejs.org/) 20+. Allow disk space and RAM for the [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B) model.

```bash
cp .env.example .env
(cd backend && uv sync)
(cd frontend && cp .env.local.example .env.local && npm install)
```

Python dependencies (including torch and the ASR library) are installed by `uv sync`.

## 2. Run

Finch needs **three processes**, each in its own terminal:

```bash
# Terminal 1: API
cd backend && uv run uvicorn app.main:app --reload

# Terminal 2: worker (runs transcription and AI notes)
cd backend && uv run huey_consumer app.domains.jobs.queue.huey -w 1

# Terminal 3: web app
cd frontend && npm run dev
```

Open http://localhost:3000.

**Why a separate worker?** Transcription takes minutes, so the API doesn't do it directly. It adds a job to a small queue (`backend/data/huey.db`) and the worker picks it up. Without the worker, jobs wait in "Queued"/"Preparing" forever. Queued jobs survive restarts.

## 3. Transcribe

In the app, click **New → Upload audio** (or **Record voice**). The first run downloads the ASR model, so expect a wait. Open the recording to see the transcript and notes.

## Optional features

Configure these in **Settings**. All settings save automatically.

### AI notes

Settings → **LLM provider**. Choose OpenRouter, OpenAI, Anthropic, or Custom (any OpenAI-compatible server such as Ollama or LM Studio; needs a base URL and model name). Keys are stored locally and never returned by the API.

Then open a recording → **Notes** tab → create a note from a template (meeting summary, action items, key decisions, follow-up email) or a blank one.

### Speaker labels

1. Create a [Hugging Face](https://huggingface.co) token and add `HF_TOKEN=hf_...` to `.env`.
2. Accept the terms for [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1).
3. Enable it in Settings → **Transcription**.
4. Optionally check your setup: `cd backend && uv run python scripts/validate_diarization.py`

Details: [diarization.md](diarization.md).

### Speaker names (voiceprints)

Requires speaker labels. Enable in Settings → **Voiceprint profiles**, then click a speaker name on any transcript turn to name them. Details: [voiceprint-profiles.md](voiceprint-profiles.md).

## Using the API directly

Interactive docs are at http://localhost:8000/docs. A minimal flow:

```bash
# Upload
curl -F "file=@your-audio.mp3" -F "source=upload" http://localhost:8000/api/audio/upload

# Start transcription (use the audio id from above)
curl -X POST http://localhost:8000/api/recordings \
  -H "Content-Type: application/json" \
  -d '{"audioAssetId": "audio_abc123", "language": "auto"}'

# Check progress / read the result
curl http://localhost:8000/api/jobs/job_abc123
curl http://localhost:8000/api/recordings/recording_abc123
```

Or use the script, which uploads, waits, and saves a `.txt` next to your file:

```bash
cd backend && uv run python scripts/transcribe_file.py your-audio.mp3
```

## Long recordings

Files up to 2 hours / 500 MB are supported. Upload a compressed file (MP3/M4A) rather than recording for hours in the browser. Transcription can take tens of minutes on CPU/MPS. See [long-audio.md](long-audio.md).

## Tests

```bash
cd backend && uv run pytest
```

Tests mock ffmpeg, ASR, diarization, and LLMs, so nothing is downloaded.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Job stuck on "Preparing" or "Queued" | The worker isn't running. Start terminal 2 |
| `ERR_CONNECTION_REFUSED` on `:8000` | The API isn't running. Start terminal 1 |
| `ffmpeg is not installed` | `brew install ffmpeg` (macOS) |
| `403` / `gated repo` | Accept the pyannote terms using the same Hugging Face account as your `HF_TOKEN` |
| No speaker labels | Run `uv run python scripts/validate_diarization.py` |
| Huey `TaskRegistry` errors | Restart the worker; if it persists, stop it and delete `backend/data/huey.db` |
| Worker won't stop on Ctrl+C | It finishes the current step first. Send SIGTERM to stop immediately (interrupted jobs are re-queued) |
| Transcript shorter than audio | Check worker logs for WARNING lines. See [long-audio.md](long-audio.md) |
| Failed job still shows in the list | By design. Read the error message, fix the cause, and re-transcribe |
| Old or corrupted local database | Delete `backend/finch.db` and restart the API. The schema is recreated |
