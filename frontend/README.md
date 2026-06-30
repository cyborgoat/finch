# Finch Frontend

Next.js app for Finch: upload, record, transcripts, speaker labels, speaker memory, AI actions, and documents.

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
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Finch API base URL |

Backend config (ASR, diarization, speaker memory, LLM) lives in repo root `.env` or `backend/.env` — not in the frontend.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Home, recent transcripts and documents |
| `/upload` | Upload audio and transcribe |
| `/record` | Browser recording with live waveform |
| `/transcripts` | Transcript library (transcribing / failed / draft states) |
| `/transcripts/[id]` | Tabbed detail: **Transcript** (edit, inline speaker pills) and **AI** (templates, documents) |
| `/documents` | Document library |
| `/documents/[id]` | Markdown editor + preview + export |
| `/settings` | Health, diarization, speaker memory profiles, privacy |

## Key UI behavior

- **Transcribing:** list and detail pages poll while `status=transcribing`
- **Failed jobs:** transcript stays visible with error message (not removed)
- **Transcript detail:** **Transcript** tab (title, per-turn speaker pills, full text) and **AI** tab (templates, job progress, generated documents)
- **Speaker labels:** click any speaker pill on a turn to assign or rename; updates all turns in that cluster immediately
- **Speaker memory:** enable and consent in **Settings** only; editing a pill updates the voiceprint from that turn’s audio when memory is on
- **Save:** toolbar **Save** persists title and full text; speaker names save via the pill dialog
- **AI actions:** run from the **AI** tab on transcript detail; poll job → navigate to new document

## Stack

Next.js 16 (App Router), Tailwind v4, shadcn/ui, TanStack Query, motion, Web Audio API (recording waveform).
