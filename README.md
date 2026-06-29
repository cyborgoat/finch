# Finch

Finch is a local-first voice transcription app. Audio is transcribed on your machine; optional LLM features (planned) will run on transcript text only.

**Current status:** Backend milestones 1–3 and frontend milestones 4–7 are complete (see [docs/TASK_TRACK.md](docs/TASK_TRACK.md)). AI document generation (milestones 8–9) and polish (milestone 10) are not started yet.

## Features (implemented)

- Upload audio files (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`, `.flac`)
- Browser recording with preview and transcription
- Normalize audio to 16 kHz mono WAV via ffmpeg
- Local ASR with [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B) (or mock mode for development)
- Background transcription jobs with polling and **in-progress “Transcribing…” status** in the transcript list
- Next.js frontend: upload, record (live waveform), transcript library, editing, copy/export TXT/MD
- Browser recording support (`audio/webm`, including `codecs=opus` MIME variants)

## Planned (not yet built)

- OpenRouter LLM actions (summaries, action items, Markdown documents)
- Document editor pages
- Motion UI polish, full settings

Full product spec: [finch_sdd_spec.md](finch_sdd_spec.md)

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/quickstart.md](docs/quickstart.md) | Install, configure, run, transcribe |
| [docs/architecture.md](docs/architecture.md) | System design and data flow |
| [docs/modules.md](docs/modules.md) | Backend module reference |
| [docs/TASK_TRACK.md](docs/TASK_TRACK.md) | Milestone progress tracker |

## Quick start

### Prerequisites

- [uv](https://docs.astral.sh/uv/)
- [ffmpeg](https://ffmpeg.org/) on your PATH
- [Node.js](https://nodejs.org/) 20+ (for frontend)

### Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

Run backend and frontend in separate terminals. The top bar shows backend health when the API is reachable.

### Transcribe a file (CLI helper)

```bash
cd backend
uv run python scripts/transcribe_file.py ../data/your-audio.mp3
```

Chunk transcripts print in the **server terminal** during long files.

### Tests

```bash
cd backend && uv run pytest
```

## Environment

Copy [.env.example](.env.example) to `backend/.env`. Key variables:

| Variable | Purpose |
|----------|---------|
| `ASR_MOCK` | `true` = mock transcript; `false` = real Qwen3-ASR |
| `ASR_MODEL_ID` | Hugging Face model id or local path |
| `HF_HOME` | Model cache directory (recommended for local dev) |
| `OPENROUTER_API_KEY` | For future LLM features (not used yet) |

Frontend: copy `frontend/.env.local.example` to `frontend/.env.local` and set `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`).

## Privacy

Audio stays on your machine. ASR runs locally. When LLM features are added, only transcript text will be sent to OpenRouter—not audio.

## Repository layout

```txt
finch/
  README.md
  finch_sdd_spec.md      # Full product SDD
  docs/                  # Architecture, modules, task track
  backend/               # FastAPI app
  frontend/              # Next.js app (milestones 4–7)
  data/                  # Runtime audio + exports (gitignored under backend/data/)
```

## License

MIT — see [LICENSE](LICENSE).
