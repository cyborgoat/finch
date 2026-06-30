# Finch Documentation

Finch is a local-first voice transcription app. Audio is transcribed on your machine; optional LLM features run on transcript text only via OpenRouter.

## Guides

| Doc | Description |
|-----|-------------|
| [Quickstart](quickstart.md) | Install, configure, run, and transcribe |
| [Diarization](diarization.md) | Speaker labels: setup, validation, tuning |
| [Speaker memory](speaker-memory.md) | Persistent speaker names and voiceprints |
| [Architecture](architecture.md) | System design, data model, request flows |
| [Features & roadmap](features.md) | What's built and what's planned |
| [Backend modules](modules.md) | `backend/app/` package reference |

## Package READMEs

- [backend/README.md](../backend/README.md) — API, env vars, tests
- [frontend/README.md](../frontend/README.md) — TanStack Start dev setup

## Core model

```txt
AudioAsset → Transcript → Document(s)
```

The transcript is the durable artifact. AI-generated Markdown documents are optional derivatives.

## Privacy

Audio stays on your machine for ASR and diarization. LLM actions send **transcript text** to OpenRouter only when you explicitly run them — never audio.
