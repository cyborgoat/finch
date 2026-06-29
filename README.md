# Finch

Finch is a local-first voice transcription app. Audio is transcribed on your machine; optional LLM features (planned) will run on transcript text only.

**Current status:** Backend milestones 1–3 are complete (see [docs/TASK_TRACK.md](docs/TASK_TRACK.md)). Frontend and AI document generation are not started yet.

## Features (implemented)

- Upload audio files (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`, `.flac`)
- Normalize audio to 16 kHz mono WAV via ffmpeg
- Local ASR with [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B) (or mock mode for development)
- Background transcription jobs with polling
- Transcript library: list, read, edit, delete

## Planned (not yet built)

- Next.js frontend (record, upload UI, transcript editor)
- OpenRouter LLM actions (summaries, action items, Markdown documents)
- Settings page, export polish, motion UI

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

### Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

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

## Privacy

Audio stays on your machine. ASR runs locally. When LLM features are added, only transcript text will be sent to OpenRouter—not audio.

## Repository layout

```txt
finch/
  README.md
  finch_sdd_spec.md      # Full product SDD
  docs/                  # Architecture, modules, task track
  backend/               # FastAPI app (implemented)
  frontend/              # Not started (Milestone 4+)
  data/                  # Runtime audio + exports (gitignored under backend/data/)
```

## License

MIT — see [LICENSE](LICENSE).
