# Features & Roadmap

What Finch does today and what is intentionally out of scope.

## Implemented

### Audio input

- Upload `.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`, `.flac`
- Browser recording with live waveform
- ffmpeg normalization to 16 kHz mono WAV

### Transcription

- Local ASR with [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B) (or `ASR_MOCK` for dev)
- Background jobs with progress stages in the UI
- Long audio chunked automatically (~45s segments)
- Failed jobs kept visible with `errorMessage` (not deleted)

### Speaker diarization (optional)

- [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1)
- Per-speaker ASR → labeled output (`Speaker 1: …`, `Speaker 2: …`)
- Falls back to full-file ASR if diarization is unavailable
- Tunable segment merge and audio source — see [diarization.md](diarization.md)

### Speaker memory (optional)

- Local voiceprint storage with [pyannote/embedding](https://huggingface.co/pyannote/embedding)
- Match unknown speakers to saved profiles or assign new names on a transcript
- Clickable speaker pills on each turn to assign or update names
- Voiceprint enrollment from Settings (consent-gated); updates when you edit a speaker pill
- Auto-match known speakers on future transcripts
- Profile management in Settings (embeddings, related transcripts)
- Consent-gated, deletable from Settings — see [speaker-memory.md](speaker-memory.md)

### File library

- Unified **Files** browser at `/files` — voice recordings only; generated documents and artifacts belong to each recording
- Home shows recent voice recordings sorted by last updated
- Recording detail at `/files/{id}` with three tabs:
  - **Source** — toolbar, title, full transcript (plain text or all segments), audio player
  - **Summary** — placeholder for a future LLM-generated overview
  - **AI** — action templates, job progress, and generated documents linked to the recording
- Bare hex IDs in URLs (e.g. `/files/a1b2c3d4e5f67890`); no `transcript_` or `doc_` prefix
- Rename and delete from an ellipsis menu; list API includes audio duration (`durationSeconds`)
- Search, edit, copy, export TXT/MD on the Source tab
- Built-in audio player (seek, ±15s skip, playback speed), current turn synced to playback, prev/next turn navigation
- Inline speaker pills on turns; click timestamps to jump in the audio
- In-progress (`transcribing`) and failed states in the UI

### AI actions (optional)

- OpenRouter integration (`LLM_MOCK` for dev)
- Templates: Markdown summary, action items, meeting notes, clean transcript, study notes
- Custom prompt support
- Generated documents linked to source transcript

### Documents

- Markdown library with editor, preview, and export
- Created manually or via AI actions from a transcript

### Operations

- Startup configuration summary and dependency checks
- `/api/health` capability flags
- Settings page shows ASR/diarization/LLM status
- `scripts/validate_diarization.py` for pre-flight checks

## Planned (post-MVP)

| Area | Examples |
|------|----------|
| Timestamps | Waveform and finer scrubbing beyond click-to-seek |
| Summary tab | LLM-generated recording overview on the detail page |
| Search | Full-text over transcripts and documents; later semantic search |
| Export | PDF, DOCX, HTML, Obsidian vault, Notion Markdown |
| Local LLM | Ollama, llama.cpp, LM Studio, vLLM for fully local summaries |
| Real-time ASR | Streaming microphone → partial transcript updates |
| Production | Auth, deployment, observability, cloud sync |
| Mobile / plugins | Mobile app, Obsidian plugin |

## Out of scope

- Team accounts, collaboration, payments
- Sending audio to external services (ASR and diarization are local-only)

## Technology stack

| Layer | Stack |
|-------|-------|
| Backend | FastAPI, uv, SQLModel, SQLite |
| ASR | `qwen-asr`, PyTorch, Qwen3-ASR-1.7B |
| Diarization | `pyannote-audio`, pyannote community-1 |
| Audio | ffmpeg, librosa |
| Frontend | TanStack Start, Tailwind v4, shadcn/ui, TanStack Query |
| LLM | OpenRouter |
