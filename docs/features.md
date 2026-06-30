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
- Clickable speaker names on each transcript turn to assign or update labels
- Voiceprint enrollment when you edit a speaker (when auto-label is on and consent given)
- Auto-match known speakers on future transcripts (when auto-label is enabled in Settings)
- Profile management in **Settings → Speakers** (rename, delete, map **You**)
- Consent-gated auto-label toggle — see [speaker-memory.md](speaker-memory.md)

### File library

- Unified **Files** browser at `/files` — voice recordings only; generated documents and artifacts belong to each recording
- Home shows recent voice recordings sorted by last updated
- Title search on the Files page (filters by recording name)
- Recording detail at `/files/{id}` with three tabs:
  - **Source** — audio player and compact scrollable transcript (speaker, timestamp, text per turn)
  - **Summary** — placeholder for a future LLM-generated overview
  - **AI** — action templates, job progress, and generated documents linked to the recording
- Prefixed IDs in URLs (e.g. `/files/transcript_a1b2c3d4e5f67890`, `/files/doc_b2c3d4e5f6789012`)
- **Topbar** on recording detail: breadcrumb navigation, download menu (audio, transcript `.txt`, summary coming soon), and actions menu (rename, delete session)
- Rename and delete from the topbar actions menu or the Files list ellipsis menu; list API includes audio duration (`durationSeconds`)
- Built-in audio player (seek, ±15s skip, playback speed)
- Transcript auto-scrolls to the active turn during playback; click timestamps to seek
- Read-only transcript on Source (no manual text editing)
- In-progress (`transcribing`) and failed states in the UI

### AI actions (optional)

- OpenRouter integration (`LLM_MOCK` for dev)
- Templates: Markdown summary, action items, meeting notes, clean transcript, study notes
- Custom prompt support
- Generated documents linked to source transcript

### Documents

- Markdown library with editor, preview, and export
- Created manually or via AI actions from a transcript

### User settings

- **You:** display name and link to your speaker profile (persisted; not yet used in LLM prompts)
- **Language:** English or 中文 (Chinese) — persisted; UI localization not implemented yet
- **AI summarization:** style (concise / balanced / detailed) and format (paragraphs / bullets) — persisted; not yet applied to Summary tab or AI actions
- **Speakers:** auto-label toggle, saved speaker list (rename / delete)
- Persisted via `GET/PATCH /api/user-settings` (stored in `AppPreference`)

### Operations

- Startup configuration summary and dependency checks
- `/api/health` capability flags (not shown on the settings page)
- `scripts/validate_diarization.py` for pre-flight checks

## Not implemented yet

| Area | Notes |
|------|--------|
| **Summary tab** | Empty placeholder; no LLM-generated recording overview on the detail page |
| **Summary download** | Topbar menu item shows “coming soon” |
| **User prefs in AI** | Language, summary style/format, and display name are stored but not passed to prompts yet |
| **UI localization** | Language setting does not translate the app |
| **Transcript editing** | Source transcript is read-only (rename title via topbar only) |
| **Full-text search** | Files search filters by title only |
| **Rich exports** | PDF, DOCX, HTML, Obsidian, Notion (audio + transcript `.txt` and document `.md` exist today) |

## Planned (post-MVP)

| Area | Examples |
|------|----------|
| Waveform | Visual waveform and finer scrubbing beyond click-to-seek |
| Summary tab | LLM-generated recording overview wired to user summarization prefs |
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
