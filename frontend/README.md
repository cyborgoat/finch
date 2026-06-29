# Finch Frontend

Next.js app for Finch (milestones 4–7): upload, record, transcript library, and editing.

**Project docs:** [../docs/README.md](../docs/README.md) · **Task track:** [../docs/TASK_TRACK.md](../docs/TASK_TRACK.md)

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

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Home + recent transcripts |
| `/upload` | Upload audio and transcribe |
| `/record` | Browser recording with live waveform |
| `/transcripts` | Transcript library |
| `/transcripts/[id]` | View/edit transcript (shows pending state while transcribing) |
| `/settings` | Backend health + privacy notice |
| `/documents` | Stub (Milestone 9) |

## Stack

Next.js 16 (App Router), Tailwind v4, shadcn/ui, TanStack Query, Web Audio API (recording waveform).
