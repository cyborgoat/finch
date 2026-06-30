# Finch

Finch is a local-first voice transcription app. Audio is transcribed on your machine; optional LLM features run on transcript text only via OpenRouter.

## Features

- Upload audio files (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`, `.flac`)
- Browser recording with live waveform visualization
- Local ASR with [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B) (or mock mode)
- Optional speaker diarization via [pyannote-audio](https://github.com/pyannote/pyannote-audio)
- Optional speaker memory — persistent names via local voiceprints
- Background transcription jobs with in-progress status in the UI
- Transcript library: table with search, rename, delete, and length; edit, copy, export TXT/MD; built-in audio player on transcript detail
- AI actions (summaries, action items, meeting notes) via OpenRouter (`LLM_MOCK` for dev)
- Document library: Markdown editor + preview + export

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
| `ASR_MOCK` | Mock local transcription |
| `DIARIZATION_ENABLED` | Enable speaker diarization pipeline |
| `DIARIZATION_MOCK` | Mock diarization (CI/dev) |
| `HF_TOKEN` | Hugging Face token for pyannote models |
| `SPEAKER_MEMORY_ENABLED` | Remember speaker names across transcripts |
| `SPEAKER_MATCH_THRESHOLD` | Auto-match similarity threshold (default `0.75`) |
| `LLM_MOCK` | Mock OpenRouter responses |
| `OPENROUTER_API_KEY` | Real LLM actions |

See [`.env.example`](.env.example) and [backend/.env.example](backend/.env.example) for all options.

## Privacy

Audio stays on your machine for ASR and diarization. LLM actions send transcript text to OpenRouter only when you explicitly run them—not audio.

## Repository layout

```txt
finch/
  backend/     # FastAPI app
  frontend/    # Next.js app
  docs/        # Official documentation
```

## License

MIT — see [LICENSE](LICENSE).
