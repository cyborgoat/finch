# Finch Frontend

TanStack Start app for Finch: upload, record, transcripts, speaker labels, voiceprint profiles, AI notes, and settings.

**Project docs:** [../docs/README.md](../docs/README.md)

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- Finch backend running on `http://localhost:8000`

## Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
```

## Run

```bash
npm run dev
```

App: http://localhost:3000

Run the backend in a separate terminal (`cd backend && uv run uvicorn app.main:app --reload`).

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Finch API base URL (browser) |
| `API_BASE_URL` | `http://localhost:8000` | Finch API base URL (SSR loaders) |

Transcription settings (diarization, voiceprint profiles, HF token) and LLM provider credentials are configured in **Settings** and stored locally in SQLite. `.env` fallbacks apply on the backend when nothing is stored yet.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (Vite + TanStack Start) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Recent voice recordings, sorted by last updated |
| `/recordings` | Voice recordings library |
| `/recordings/$id` | Recording detail (Source, Notes tabs) |
| `/upload` | Upload audio and transcribe |
| `/record` | Browser recording with live waveform |
| `/settings` | User profile, language (UI + AI content), AI note prefs, transcription, voiceprint profiles, LLM provider |

## Layout and navigation

- **Sidebar:** **New** dropdown (Record voice / Upload audio); Home, Recordings, Settings
- **Topbar:** breadcrumb trail (route-aware); on recording detail, download and actions buttons on the right
- **Pages:** wide `max-w-6xl` content; upload/record use a centered column; settings uses `max-w-3xl`

## Key UI behavior

### Recordings and home

- **Home:** recent voice recordings, sorted by last updated
- **Recordings browser:** voice recordings only; notes live under each recording’s **Notes** tab
- **Search:** filters recordings by title (client-side)
- **List actions:** ellipsis menu — rename and delete
- **Transcribing / failed:** list and detail pages poll while `status=transcribing`; failed jobs stay visible with `errorMessage`

### Recording detail (`/recordings/recording_*`)

- **Topbar download menu:** audio file, transcript `.txt`, active note `.md`
- **Topbar actions menu:** rename recording, delete session
- **Source tab:** audio player, then compact scrollable transcript
  - Each turn: speaker name, timestamp range, text
  - Active turn highlighted; list auto-scrolls during playback
  - Click timestamp to seek; click speaker name to assign/rename (when diarization data exists)
  - Transcript text is read-only
- **Notes tab:** multiple markdown notes per recording
  - Dropdown to switch notes; **+** to create; **⋯** menu for rename/delete
  - AI templates: meeting summary, action items, key decisions, follow-up email; or blank note
  - MDXEditor with auto-save toggle (default on) or manual Save
  - Meeting summary prompts use content language and summarization prefs from Settings; all AI templates use content language

### Internationalization

- UI strings use `react-i18next` with locale files under `src/i18n/locales/`
- **Settings → Language & region:** `uiLanguage` (interface) and `contentLanguage` (AI output) are stored separately via `GET/PATCH /api/user-settings`

### Settings

- **You:** display name and linked voiceprint profile (`GET/PATCH /api/user-settings`)
- **Language & region:** interface language and AI note content language (English or 中文)
- **AI notes:** summary style/format and auto-save toggle
- **Transcription:** diarization, voiceprint profiles, Hugging Face token (`GET/PATCH /api/transcription-settings`)
- **Voiceprint profiles:** auto-label toggle (consent on first enable), rename/delete profiles
- **LLM provider:** configurable provider credentials (stored locally in SQLite)
- **Backend capabilities** (ASR): startup logs and `/api/health`

## IDs

Recording IDs use the `recording_` prefix in URLs. Notes use `note_` IDs in the API and are opened on a recording’s **Notes** tab (`?tab=notes&noteId=…`). Other resources use their own prefixes (`audio_`, `job_`, `speaker_`, etc.).

## Stack

TanStack Start (Router + SSR), Vite, Tailwind v4, shadcn/ui, TanStack Query, MDXEditor, motion, Web Audio API (recording waveform).

## Source layout

All application code lives under `frontend/src/` (`@/*` path alias): routes, components, hooks, and lib modules. Vite is configured with `srcDirectory: "src"`.
