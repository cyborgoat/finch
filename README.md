# Finch

Finch is a local-first voice transcription app. Audio is transcribed on your machine; optional LLM features run on transcript text only via a configurable provider (OpenRouter, OpenAI, Anthropic, or custom OpenAI-compatible endpoints such as Ollama).

## Features

- Upload audio files (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`, `.flac`)
- Browser recording with live waveform visualization
- Local ASR with [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B)
- Optional speaker diarization via [pyannote-audio](https://github.com/pyannote/pyannote-audio)
- Optional speaker memory — persistent names via local voiceprints
- Background transcription jobs with in-progress status in the UI
- Transcript library: **Files** at `/files` (voice recordings); detail page with **Source** and **Notes** tabs; topbar download/actions
- AI note templates (meeting summary, action items, key decisions, follow-up email) and blank notes via configurable LLM providers
- Markdown notes with MDXEditor; auto-save or manual save

See [docs/features.md](docs/features.md) for the full feature list and roadmap.

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/README.md](docs/README.md) | Documentation index |
| [docs/quickstart.md](docs/quickstart.md) | Install, configure, run, transcribe |
| [docs/diarization.md](docs/diarization.md) | Speaker labels: setup, validation, tuning |
| [docs/speaker-memory.md](docs/speaker-memory.md) | Persistent speaker names and voiceprints |
| [docs/architecture.md](docs/architecture.md) | System design and data flow |
| [docs/modules.md](docs/modules.md) | Backend module reference |
| [docs/features.md](docs/features.md) | Implemented features and planned work |

## Quick start

### Prerequisites

- [uv](https://docs.astral.sh/uv/)
- [ffmpeg](https://ffmpeg.org/) on your PATH
- [Node.js](https://nodejs.org/) 20+

### Backend

Copy [`.env.example`](.env.example) to **repo root `.env`** or `backend/.env` (both are loaded):

```bash
cp .env.example .env
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

Watch the uvicorn terminal on startup for the configuration summary.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

### Tests

```bash
cd backend && uv run pytest
```

### Diarization validation

```bash
cd backend && uv run python scripts/validate_diarization.py
```

## Environment highlights

| Variable | Purpose |
|----------|---------|
| `DIARIZATION_ENABLED` | Enable speaker diarization pipeline |
| `HF_TOKEN` | Hugging Face token for pyannote models |
| `SPEAKER_MEMORY_ENABLED` | Remember speaker names across transcripts |
| `SPEAKER_MATCH_THRESHOLD` | Auto-match similarity threshold (default `0.75`) |

LLM provider credentials are **not** configured via `.env`. Use **Settings → LLM provider** in the frontend; values are stored locally in SQLite.

See [`.env.example`](.env.example) and [backend/.env.example](backend/.env.example) for all options.

## Privacy

Audio stays on your machine for ASR and diarization. LLM actions send transcript text to your configured provider only when you explicitly run them—not audio.

## Repository layout

```txt
finch/
  backend/     # FastAPI app
  frontend/    # TanStack Start app
  docs/        # Official documentation
```

## License

MIT — see [LICENSE](LICENSE).
