# Finch Frontend

TanStack Start app for Finch: upload, record, transcripts, speaker labels, speaker memory, AI notes, and documents.

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

Backend config (ASR, diarization, speaker memory) lives in repo root `.env` or `backend/.env`. LLM provider credentials are configured in **Settings → LLM provider** and stored locally in SQLite.

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
| `/files` | Voice recordings library |
| `/files/$id` | Recording detail (Source, Notes tabs) or standalone document editor |
| `/upload` | Upload audio and transcribe |
| `/record` | Browser recording with live waveform |
| `/settings` | User profile, language (UI + AI content), AI note prefs, speakers, LLM provider |

## Layout and navigation

- **Sidebar:** **New** dropdown (Record voice / Upload audio); Home, Files, Settings
- **Topbar:** breadcrumb trail (route-aware); on recording detail, download and actions buttons on the right
- **Pages:** wide `max-w-6xl` content; upload/record use a centered column; settings uses `max-w-3xl`

## Key UI behavior

### Files and home

- **Home:** recent voice recordings, sorted by last updated
- **Files browser:** voice recordings only; notes live under each recording’s **Notes** tab
- **Search:** filters recordings by title (client-side)
- **List actions:** ellipsis menu — rename and delete
- **Transcribing / failed:** list and detail pages poll while `status=transcribing`; failed jobs stay visible with `errorMessage`

### Recording detail (`/files/transcript_*`)

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

### Document detail (`/files/doc_*`)

- MDXEditor with title field, auto-save, copy, export `.md`, delete

### Settings

- **You:** display name and linked speaker profile (`GET/PATCH /api/user-settings`)
- **Language & region:** interface language and AI note content language (English or 中文)
- **AI notes:** summary style/format and auto-save toggle
- **Speakers:** auto-label toggle (consent on first enable), rename/delete profiles
- **LLM provider:** configurable provider credentials (stored locally in SQLite)
- **Backend capabilities** (ASR, diarization): configured in `.env` — startup logs and `/api/health`

## IDs

Transcript and document IDs use type prefixes (`transcript_`, `doc_`) in URLs and API paths. Other resources use their own prefixes (`audio_`, `job_`, `speaker_`, etc.).

## Stack

TanStack Start (Router + SSR), Vite, Tailwind v4, shadcn/ui, TanStack Query, MDXEditor, motion, Web Audio API (recording waveform).

## Source layout

Active application code lives under `frontend/src/` (`@/*` path alias). The TanStack Start entrypoint, routes, components, hooks, and lib modules are all in `src/`.
