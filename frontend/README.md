# Finch Frontend

Next.js app for Finch (milestones 4–11): upload, record, transcripts, speaker labels, AI actions, and documents.

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

Backend config (ASR, diarization, LLM) lives in repo root `.env` or `backend/.env` — not in the frontend.

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
| `/transcripts/[id]` | Edit transcript, speaker segments, AI actions, linked documents |
| `/documents` | Document library |
| `/documents/[id]` | Markdown editor + preview + export |
| `/settings` | Backend health, ASR/diarization/LLM capability status, privacy |

## Key UI behavior

- **Transcribing:** list and detail pages poll while `status=transcribing`
- **Failed jobs:** transcript stays visible with error message (not removed)
- **Speaker labels:** “By speaker” section when backend returns `speakerSegments` or labeled `rawText`
- **AI actions:** run from transcript detail; poll job → navigate to new document
- **Settings:** reads `/api/health` capability flags (diarization ready, mock modes, etc.)

## Stack

Next.js 16 (App Router), Tailwind v4, shadcn/ui, TanStack Query, motion, Web Audio API (recording waveform).
