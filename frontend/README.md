# Finch Frontend

TanStack Start app for Finch: upload, record, transcripts, speaker labels, speaker memory, summarization, and documents.

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
| `/files/$id` | Recording detail (Source, Summary tabs) or document editor |
| `/upload` | Upload audio and transcribe |
| `/record` | Browser recording with live waveform |
| `/settings` | User profile, language, AI summarization prefs, speakers |

## Layout and navigation

- **Sidebar:** **New** dropdown (Record voice / Upload audio); Home, Files, Settings
- **Topbar:** breadcrumb trail (route-aware); on recording detail, download and actions buttons on the right
- **Pages:** wide `max-w-6xl` content; upload/record use a centered column; settings uses `max-w-3xl`

## Key UI behavior

### Files and home

- **Home:** recent voice recordings, sorted by last updated
- **Files browser:** voice recordings only; summaries live under each recording’s **Summary** tab
- **Search:** filters recordings by title (client-side)
- **List actions:** ellipsis menu — rename and delete
- **Transcribing / failed:** list and detail pages poll while `status=transcribing`; failed jobs stay visible with `errorMessage`

### Recording detail (`/files/transcript_*`)

- **Topbar download menu:** audio file, transcript `.txt`, summary `.md` (when generated)
- **Topbar actions menu:** rename recording, delete session
- **Source tab:** audio player, then compact scrollable transcript
  - Each turn: speaker name, timestamp range, text (typography distinguishes the three)
  - Active turn highlighted; list auto-scrolls during playback
  - Click timestamp to seek; click speaker name to assign/rename (when diarization data exists)
  - Transcript text is read-only
- **Summary tab:** generate or regenerate an LLM summary; uses language and summarization prefs from Settings

### Document detail (`/files/doc_*`)

- Markdown editor, preview, toolbar (save, copy, export `.md`, delete)

### Settings

- **You:** display name and linked speaker profile (`GET/PATCH /api/user-settings`)
- **Language / AI summarization:** preferences persisted on the backend and applied to summary prompts
- **Speakers:** auto-label toggle (consent on first enable), rename/delete profiles
- **Backend capabilities** (ASR, diarization): configured in `.env` — startup logs and `/api/health`
- **LLM provider**: configurable in **Settings → LLM provider** or `.env`

## IDs

Transcript and document IDs use type prefixes (`transcript_`, `doc_`) in URLs and API paths. Other resources use their own prefixes (`audio_`, `job_`, `speaker_`, etc.).

## Stack

TanStack Start (Router + SSR), Vite, Tailwind v4, shadcn/ui, TanStack Query, TanStack Table, motion, Web Audio API (recording waveform).
