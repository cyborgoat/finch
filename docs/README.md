# Finch Documentation

Finch is a local-first voice transcription app. Audio is transcribed on your machine; optional LLM note generation runs on transcript text only via a provider you configure in Settings.

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
AudioAsset → Transcript (recording) → Document(s) / notes (optional)
```

The transcript is the durable artifact. LLM-generated and manual Markdown notes are optional derivatives stored as documents linked to the source recording.

## Frontend routes

| Route | Purpose |
|-------|---------|
| `/` | Recent voice recordings |
| `/files` | Full recordings library (title search) |
| `/files/{id}` | Recording detail (Source / Notes) or standalone document editor |
| `/upload`, `/record` | Create new recordings |
| `/settings` | User profile, language, AI note prefs, LLM provider, speakers |

Recording detail uses a **topbar** with breadcrumbs, a download menu (audio, transcript `.txt`, active note `.md`), and actions (rename, delete). The **Source** tab shows the audio player and a compact auto-scrolling transcript. The **Notes** tab supports multiple markdown notes per recording (AI templates or blank), with a dropdown to switch notes, rename/delete actions, and MDXEditor.

LLM provider credentials are configured in **Settings → LLM provider** and stored locally in SQLite — not in `.env`.

Recording and document IDs use type prefixes (`transcript_`, `doc_`) so routes can infer file kind from the URL. Other resources use their own prefixes (`audio_`, `job_`, etc.).

## Privacy

Audio stays on your machine for ASR and diarization. Note generation sends **transcript text** to your configured provider only when you explicitly create or generate a note — never audio.
