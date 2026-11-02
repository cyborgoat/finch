# Finch Frontend

The Finch web app (TanStack Start): upload, record, transcripts, notes, and settings.

Setup and running: see the [Quickstart](../docs/quickstart.md).

## Run

```bash
cp .env.local.example .env.local
npm install
npm run dev     # http://localhost:3000
```

The backend API **and worker** must be running, or transcription jobs will stay on "Preparing". See [Quickstart](../docs/quickstart.md#2-run).

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | API URL used by the browser |
| `API_BASE_URL` | `http://localhost:8000` | API URL used by server-side rendering |

Everything else (transcription options, LLM provider) is set in the app's **Settings** page.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Recent recordings |
| `/recordings` | Recordings library with title search |
| `/recordings/$id` | Recording detail: **Source** (audio and transcript) and **Notes** tabs |
| `/upload`, `/record` | Create a recording |
| `/settings` | Profile, language, LLM provider, transcription, voiceprints |

## Stack

TanStack Start (Router + SSR), Vite, Tailwind v4, shadcn/ui, TanStack Query, MDXEditor, motion, Web Audio API (recording waveform).

## Source layout

All application code lives under `frontend/src/` (`@/*` path alias): routes, components, hooks, and lib modules. Vite is configured with `srcDirectory: "src"`.
