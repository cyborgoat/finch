<div align="center">

<img src="frontend/public/logo.png" alt="Finch logo" width="110" />

# Finch

**Local-first voice transcription with optional speaker labels and AI notes.**

[![License: MIT](https://img.shields.io/github/license/cyborgoat/finch?style=flat-square)](LICENSE)
![Python](https://img.shields.io/badge/python-3.13%2B-3776AB?style=flat-square&logo=python&logoColor=white)
![Node](https://img.shields.io/badge/node-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Privacy](https://img.shields.io/badge/audio-never%20leaves%20your%20machine-2ea44f?style=flat-square)

[Quick start](#quick-start) ·
[Features](#features) ·
[Documentation](#documentation) ·
[Report a bug](https://github.com/cyborgoat/finch/issues)

</div>

---

## What is Finch?

Finch turns recordings into searchable transcripts and notes without sending your
audio anywhere. Upload a file or record in the browser, and Finch transcribes it
on your own machine with an open speech model. If you want a meeting summary or a
list of action items, Finch can draft them with an LLM provider you choose. Only
the **transcript text** is sent, and only when you ask for it.

## Features

- **Local transcription.** Powered by
  [Qwen3-ASR](https://huggingface.co/Qwen/Qwen3-ASR-1.7B), running on your
  machine. Long recordings (up to 2 hours / 500 MB) are chunked automatically.
- **Upload or record.** `.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`, and `.flac`, or
  record straight from the browser with a live waveform.
- **Speaker labels (optional).** Diarization with
  [pyannote](https://huggingface.co/pyannote/speaker-diarization-community-1)
  produces `Speaker 1`, `Speaker 2`, and so on.
- **Remembered speakers (optional).** Save voiceprints locally so known people are
  recognized in future recordings.
- **Notes.** Write Markdown notes by hand or generate them from templates such as
  meeting summary, action items, key decisions, and follow-up email. Edit them in
  a rich Markdown editor.
- **Bring your own LLM.** OpenRouter, OpenAI, Anthropic, or any
  OpenAI-compatible endpoint such as Ollama, LM Studio, or vLLM.
- **Review workspace.** Built-in audio player with seek and playback speed, a
  transcript that follows playback, and downloads for audio, transcript, and
  notes.
- **English and 中文** interface.

## Quick start

**You need:** [uv](https://docs.astral.sh/uv/), [ffmpeg](https://ffmpeg.org/) on
your `PATH`, and [Node.js](https://nodejs.org/) 20+.

Finch runs as **three processes**, so open three terminals.

```bash
# One-time setup
cp .env.example .env
(cd backend && uv sync)
(cd frontend && cp .env.local.example .env.local && npm install)
```

| Terminal | Command | What it does |
|----------|---------|--------------|
| 1. API | `cd backend && uv run uvicorn app.main:app --reload` | Receives uploads, serves data |
| 2. Worker | `cd backend && uv run huey_consumer app.domains.jobs.queue.huey -w 1` | Runs transcription and AI note generation |
| 3. Web app | `cd frontend && npm run dev` | The UI at http://localhost:3000 |

> **Stuck on "Preparing" or "Queued"?** The worker (terminal 2) isn't running.
> The API only adds jobs to a queue; the worker processes them.

The first transcription downloads the speech model, so it takes a while.

## Optional features

Turn these on in **Settings** in the app.

| Feature | Extra step |
|---------|-----------|
| AI notes | Settings → LLM provider: pick a provider and enter an API key (or a local Ollama URL) |
| Speaker labels | Put `HF_TOKEN=hf_...` in `.env`, accept the [pyannote model terms](https://huggingface.co/pyannote/speaker-diarization-community-1), then enable in Settings → Transcription. See [diarization](docs/diarization.md) |
| Speaker names | Requires speaker labels. Enable in Settings → Voiceprint profiles. See [voiceprints](docs/voiceprint-profiles.md) |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Job stays on "Preparing" / "Queued" | Start the worker (terminal 2) |
| `ERR_CONNECTION_REFUSED` on `:8000` | Start the API (terminal 1) |
| `ffmpeg is not installed` | `brew install ffmpeg` |
| `403` / `gated repo` | Accept the pyannote terms with the same Hugging Face account as your `HF_TOKEN` |

More in [docs/quickstart.md](docs/quickstart.md#troubleshooting).

## Privacy

Audio never leaves your machine. LLM features send transcript text to the provider
you configured, and only when you run them. API keys and settings are stored
locally in SQLite.

## Documentation

- [Quickstart](docs/quickstart.md): setup, API usage, troubleshooting
- [Features and roadmap](docs/features.md): what works today and what doesn't yet
- [Diarization](docs/diarization.md) · [Voiceprints](docs/voiceprint-profiles.md) · [Long audio](docs/long-audio.md)
- [Architecture](docs/architecture.md) · [Backend modules](docs/modules.md)

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | Python 3.13, FastAPI, SQLAlchemy, Alembic, SQLite |
| Jobs | Huey worker with a SQLite-backed queue |
| Speech | Qwen3-ASR, pyannote (diarization and speaker embeddings), ffmpeg |
| Frontend | React, TanStack Start / Router / Query, Vite, MDXEditor, react-i18next |

## Contributing

Issues and pull requests are welcome. Please open an issue first for larger
changes. [docs/architecture.md](docs/architecture.md) and
[docs/modules.md](docs/modules.md) describe how the backend is organized.

## License

MIT. See [LICENSE](LICENSE).
