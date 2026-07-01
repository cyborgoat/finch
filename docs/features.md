# Features & Roadmap

What Finch does today and what is intentionally out of scope.

## Implemented

### Audio input

- Upload `.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`, `.flac`
- Browser recording with live waveform
- ffmpeg normalization to 16 kHz mono WAV

### Transcription

- Local ASR with [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B)
- Background jobs with progress stages in the UI
- Long audio chunked automatically (~45s segments)
- Failed jobs kept visible with `errorMessage` (not deleted)

### Speaker diarization (optional)

- [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1)
- Per-speaker ASR → labeled output (`Speaker 1: …`, `Speaker 2: …`)
- Falls back to full-file ASR if diarization is unavailable
- Tunable segment merge and audio source — see [diarization.md](diarization.md)
- Enable diarization in **Settings → Transcription** (or `DIARIZATION_ENABLED=true` in `.env` as fallback); set `HF_TOKEN` in `.env`

### Voiceprint profiles (optional)

- Local voiceprint storage with [pyannote/embedding](https://huggingface.co/pyannote/embedding)
- Match unknown speakers to saved profiles or assign new names on a transcript
- Clickable speaker names on each transcript turn to assign or update labels
- Voiceprint enrollment when you edit a speaker (when auto-label is on and consent given)
- Auto-match known speakers on future transcripts (when auto-label is enabled in Settings)
- Profile management in **Settings → Voiceprint profiles** (rename, delete); record your voiceprint under **Settings → About you**
- Consent-gated auto-label toggle — see [voiceprint-profiles.md](voiceprint-profiles.md)

### Recordings library

- **Recordings** browser at `/recordings` — voice recordings only; notes belong to each recording
- Home shows recent voice recordings sorted by last updated
- Title search on the Recordings page (filters by recording name)
- Recording detail at `/recordings/{id}` with two tabs:
  - **Source** — audio player and compact scrollable transcript (speaker, timestamp, text per turn)
  - **Notes** — multiple markdown notes per recording (AI templates or blank), editable with MDXEditor
- Prefixed recording IDs in URLs (e.g. `/recordings/recording_a1b2c3d4e5f67890`)
- **Topbar** on recording detail: breadcrumb navigation, download menu (audio, transcript `.txt`, active note `.md`), and actions menu (rename, delete session)
- Rename and delete from the topbar actions menu or the Recordings list ellipsis menu; list API includes audio duration (`durationSeconds`)
- Built-in audio player (seek, ±15s skip, playback speed)
- Recording auto-scrolls to the active turn during playback; click timestamps to seek
- Read-only transcript on Source (no manual text editing)
- In-progress (`transcribing`) and failed states in the UI

### Notes (optional)

- Configurable LLM providers: OpenRouter (default), OpenAI, Anthropic, custom OpenAI-compatible (Ollama, LM Studio, vLLM)
- Provider selection and API keys in **Settings → LLM provider** (auto-save; stored locally in SQLite)
- **Notes** tab on each recording: create multiple markdown notes via AI templates or blank note
- AI templates: meeting summary, action items, key decisions, follow-up email
- MDXEditor for in-app note editing; auto-save toggle (default on) or manual Save
- User content language, summary style/format, and display name applied to AI note prompts (content language on all templates; style/format on meeting summary)
- Notes stored as linked markdown per recording (`meeting_summary`, `action_items`, `note`, etc.)
- Switch notes via dropdown (`?tab=notes&noteId=…`); rename/delete from the notes actions menu

### User settings

- **About you:** display name and voiceprint enrollment (warning when not recorded — recordings cannot recognize your voice until set)
- **Language & region:** interface language (English / 中文) and AI note content language
- **AI notes:** style (concise / balanced / detailed), format (paragraphs / bullets), note auto-save toggle
- **Transcription:** diarization and voiceprint profile toggles (auto-save)
- **LLM provider:** provider, API key, base URL, model (auto-save on change or blur)
- **Voiceprint profiles:** auto-label toggle, saved profile list (rename / delete)
- All settings auto-save — no Save buttons. `HF_TOKEN` is backend `.env` only.
- Persisted via `GET/PATCH /api/user-settings`, `/api/transcription-settings`, `/api/llm-settings`, and voiceprint APIs (stored in `AppPreference`)

### Internationalization

- Full UI localization: English and 中文 (Chinese) via `react-i18next`
- **Interface language** (`uiLanguage`) — menus, buttons, labels, toasts
- **AI note language** (`contentLanguage`) — language instruction injected into all AI note templates
- Locale files: `frontend/src/i18n/locales/en.json`, `zh.json`

### Operations

- Startup configuration summary and dependency checks
- `/api/health` capability flags
- `scripts/validate_diarization.py` for pre-flight checks

## Not implemented yet

| Area | Notes |
|------|--------|
| **Transcript editing** | Source transcript is read-only (rename title via topbar only) |
| **Full-text search** | Recordings search filters by title only |
| **Rich exports** | PDF, DOCX, HTML, Obsidian, Notion (audio + transcript `.txt` and note `.md` exist today) |

## Planned (post-MVP)

| Area | Examples |
|------|----------|
| Waveform | Visual waveform and finer scrubbing beyond click-to-seek |
| Search | Full-text over transcripts and notes; later semantic search |
| Export | PDF, DOCX, HTML, Obsidian vault, Notion Markdown |
| Local LLM | Configure via Settings → LLM provider with `custom` (Ollama, LM Studio, vLLM) |
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
| LLM | Configurable providers (OpenRouter, OpenAI, Anthropic, custom) |
