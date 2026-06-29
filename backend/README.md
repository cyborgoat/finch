# Finch Backend

Local ASR transcription API for Finch.

**Project docs:** [../docs/README.md](../docs/README.md) · **Task track:** [../docs/TASK_TRACK.md](../docs/TASK_TRACK.md)

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- [ffmpeg](https://ffmpeg.org/) on your PATH (required for audio normalization)

## Setup

```bash
cd backend
cp .env.example .env
uv sync
```

## Run

```bash
uv run uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

## Tests

```bash
uv run pytest
```

Tests mock `ffmpeg` subprocess calls and use `ASR_MOCK=true` by default.

## Environment

| Variable | Description |
|----------|-------------|
| `ASR_MOCK` | When `true`, returns a mock transcript without loading Qwen3-ASR |
| `DATABASE_URL` | SQLite connection string |
| `MAX_UPLOAD_MB` | Maximum upload size in megabytes |

## Real ASR

To use Qwen3-ASR-1.7B locally:

```bash
uv add torch transformers accelerate
```

Set in `.env`:

```env
ASR_MOCK=false
```

The model is loaded lazily on the first transcription request.

## API

- `GET /api/health`
- `POST /api/audio/upload`
- `GET /api/audio/{id}`
- `DELETE /api/audio/{id}`
- `POST /api/transcripts`
- `GET /api/transcripts`
- `GET /api/transcripts/{id}`
- `PATCH /api/transcripts/{id}`
- `DELETE /api/transcripts/{id}`
- `GET /api/jobs/{id}`
