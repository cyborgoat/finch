# Finch Frontend

TanStack Start app for Finch: upload, record, transcripts, speaker labels, speaker memory, AI actions, and documents.

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

Backend config (ASR, diarization, speaker memory, LLM) lives in repo root `.env` or `backend/.env` — not in the frontend.

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
| `/files/$id` | Recording detail (Source, Summary, AI tabs) or document editor |
| `/upload` | Upload audio and transcribe |
| `/record` | Browser recording with live waveform |
| `/settings` | User profile, language, AI summarization prefs, speakers |

## Key UI behavior

- **Layout:** wide `max-w-6xl` pages with generous spacing; upload/record use a centered content column; settings uses a single-column layout (`max-w-3xl`)
- **Sidebar:** **New** dropdown (Record voice / Upload audio); Home, Files, Settings
- **Home:** recent voice recordings, sorted by last updated
- **Files browser:** voice recordings only; AI documents and artifacts live under each recording (see the AI tab on the detail page)
- **File lists:** row styling reflects transcription status without a status column
- **List actions:** ellipsis menu — rename and delete for recordings
- **Transcribing:** list and detail pages poll while `status=transcribing`
- **Failed jobs:** transcript stays visible with error message (not removed)
- **Source tab:** toolbar, title, full transcript (text or segments toggle)
- **Summary tab:** placeholder for future LLM-generated overview
- **AI tab:** AI action templates, job progress, and generated documents
- **Audio player:** centered play control below the track, ±15s skip, speed dropdown (0.5×–5×)
- **Current turn:** single active segment below the player, with prev/next arrows
- **Speaker labels:** click any speaker pill on a turn to assign or rename; updates all turns in that cluster immediately
- **Settings → Speakers:** auto-label toggle (with consent on first enable), rename/delete saved speaker profiles; map one profile as **You**
- **Settings → You:** display name and link to your speaker profile (stored via `GET/PATCH /api/user-settings`)
- **Settings → Language / AI summarization:** user preferences persisted on the backend
- **Backend capabilities** (ASR, diarization, LLM): configured in `.env` only — startup logs and `/api/health`; not shown on the settings page
- **Save:** toolbar **Save** persists title and full text; speaker names save via the pill dialog
- **AI actions:** run from the **AI** tab; poll job → open new document at `/files/{id}`

## IDs

Transcript and document IDs use type prefixes (`transcript_`, `doc_`) in URLs and API paths. Other resources use their own prefixes (`audio_`, `job_`, `speaker_`, etc.).

## Stack

TanStack Start (Router + SSR), Vite, Tailwind v4, shadcn/ui, TanStack Query, TanStack Table, motion, Web Audio API (recording waveform).
