# Finch Documentation

Finch is a local-first voice transcription app. New here? Start with the [Quickstart](quickstart.md).

| Doc | Read it when you want to… |
|-----|---------------------------|
| [Quickstart](quickstart.md) | Install and run Finch, fix common problems |
| [Diarization](diarization.md) | Add speaker labels |
| [Voiceprint profiles](voiceprint-profiles.md) | Remember speaker names across recordings |
| [Long audio](long-audio.md) | Transcribe 1–2 hour files |
| [Architecture](architecture.md) | Understand how the pieces fit together |
| [Backend modules](modules.md) | Find your way around `backend/app/` |
| [Features & roadmap](features.md) | See what's built and planned |

Package READMEs: [backend](../backend/README.md) · [frontend](../frontend/README.md)

## Core idea

```txt
Audio file → Recording (transcript) → Notes (optional)
```

The transcript is the permanent record. Notes, whether AI-generated or hand-written, are optional extras attached to a recording.

## Things to know

- **Three processes run locally:** API, worker, and web app. The worker does the heavy lifting; see [Quickstart](quickstart.md#2-run).
- **Settings live in the app** (Settings page, auto-saved to a local SQLite database). The one exception is `HF_TOKEN`, which goes in `.env`.
- **Privacy:** audio stays on your machine. Only transcript text is sent to an LLM, and only when you generate a note.
