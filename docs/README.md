# Finch Documentation

Finch is a local-first voice transcription app. Audio is transcribed on your machine; optional LLM note generation runs on transcript text only via a provider you configure in Settings.

## Guides

| Doc | Description |
|-----|-------------|
| [Quickstart](quickstart.md) | Install, configure, run, and transcribe |
| [Diarization](diarization.md) | Speaker labels: setup, validation, tuning |
| [Voiceprint profiles](voiceprint-profiles.md) | Persistent speaker names and local voiceprints |
| [Architecture](architecture.md) | System design, data model, request flows |
| [Features & roadmap](features.md) | What's built and what's planned |
| [Backend modules](modules.md) | `backend/app/` package reference |

## Package READMEs

- [backend/README.md](../backend/README.md) — API, env vars, tests
- [frontend/README.md](../frontend/README.md) — TanStack Start dev setup

## Core model

```txt
AudioAsset → Recording → Note(s) (optional)
```

The transcript on a recording is the durable artifact. LLM-generated and manual Markdown notes are optional derivatives linked to the source recording.

**Local dev requires two backend processes:** the FastAPI server and the Huey job consumer (see [quickstart.md](quickstart.md)).

## Frontend routes

| Route | Purpose |
|-------|---------|
| `/` | Recent voice recordings |
| `/recordings` | Full recordings library (title search) |
| `/recordings/{id}` | Recording detail (**Source** / **Notes** tabs) |
| `/upload`, `/record` | Create new recordings |
| `/settings` | User profile, language, AI note prefs, LLM provider, transcription, voiceprint profiles |

Recording detail uses a **topbar** with breadcrumbs, a download menu (audio, transcript `.txt`, active note `.md`), and actions (rename, delete). The **Source** tab shows the audio player and a compact auto-scrolling transcript. The **Notes** tab supports multiple markdown notes per recording (AI templates or blank), with a dropdown to switch notes, rename/delete actions, and MDXEditor.

LLM and transcription toggles are configured in the frontend and stored locally in SQLite. `HF_TOKEN` is backend `.env` only. All settings auto-save.

Recording IDs use the `recording_` prefix in URLs (e.g. `/recordings/recording_a1b2c3d4e5f67890`). Notes use `note_` IDs in the API but are opened on a recording’s **Notes** tab (`?tab=notes&noteId=…`), not as standalone routes. Other resources use their own prefixes (`audio_`, `job_`, etc.).

## Privacy

Audio stays on your machine for ASR and diarization. Note generation sends **transcript text** to your configured provider only when you explicitly create or generate a note — never audio.
