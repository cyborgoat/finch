# Finch Task Track

Living checklist aligned with [finch_sdd_spec.md](../finch_sdd_spec.md) Section 22 (Development Milestones).

**Last updated:** 2026-06-29  
**Overall:** Backend milestones 1–3 and frontend milestones 4–7 complete. Milestones 8–10 not started.

Recent additions (2026-06-29): live recording waveform, `transcribing` placeholder status in transcript list, browser `audio/webm;codecs=opus` upload fix.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🚧 | In progress |
| ⬜ | Not started |
| ⏸ | Deferred / blocked |

---

## Milestone 1: Backend Skeleton — ✅

| Task | Status | Notes |
|------|--------|-------|
| Create backend with uv | ✅ | `backend/pyproject.toml`, `uv.lock` |
| Add FastAPI | ✅ | `app/main.py` |
| Add health route | ✅ | `GET /api/health` |
| Add settings | ✅ | `app/config.py`, `.env.example` |
| Add SQLite setup | ✅ | SQLModel + `app/storage/database.py` |
| Add base models | ✅ | AudioAsset, Transcript, Job |
| Add CORS | ✅ | `localhost:3000` |

**Acceptance:** `uv run uvicorn app.main:app --reload` works; `/api/health` returns ok; SQLite initializes.

---

## Milestone 2: Audio Upload and Storage — ✅

| Task | Status | Notes |
|------|--------|-------|
| Audio upload endpoint | ✅ | `POST /api/audio/upload` |
| Save original audio file | ✅ | `data/audio/original/` |
| Normalize with ffmpeg | ✅ | 16 kHz mono WAV |
| Create AudioAsset DB record | ✅ | |
| Return metadata | ✅ | camelCase JSON |
| GET / DELETE audio | ✅ | Extra routes implemented |

**Acceptance:** Upload `.webm`, `.mp3`, `.wav`; normalized WAV created; AudioAsset in DB.

---

## Milestone 3: Transcription Pipeline — ✅

| Task | Status | Notes |
|------|--------|-------|
| ASR service | ✅ | Mock + real Qwen3-ASR via `qwen-asr` |
| Transcript job creation | ✅ | `POST /api/transcripts` |
| Job status endpoint | ✅ | `GET /api/jobs/{id}` |
| Transcript creation | ✅ | Background worker |
| Transcript detail + list | ✅ | GET, PATCH, DELETE |
| Mock ASR mode | ✅ | `ASR_MOCK=true` |
| Real ASR integration | ✅ | `ASR_MOCK=false`, chunked long audio |
| Chunk progress logging | ✅ | Per-chunk stdout + job stage updates |
| CLI transcribe script | ✅ | `backend/scripts/transcribe_file.py` |

**Acceptance:** Upload → job → poll → transcript stored and fetchable. Verified with real ASR on long MP3.

---

## Milestone 4: Frontend Skeleton — ✅

| Task | Status | Notes |
|------|--------|-------|
| Create Next.js frontend | ✅ | `frontend/` with App Router |
| Add Tailwind | ✅ | Tailwind v4 |
| Add shadcn/ui | ✅ | button, card, input, textarea, badge, progress, separator, skeleton, sonner |
| Add app shell | ✅ | `AppShell`, `Sidebar`, `Topbar` with health indicator |
| Add pages (stubs) | ✅ | All routes; documents stubbed for M9 |
| Add API client | ✅ | `lib/api.ts`, `lib/types.ts`, TanStack Query provider |

**Acceptance:** `npm run dev` loads; navigation works; home page shows backend health.

---

## Milestone 5: Upload Flow — ✅

| Task | Status | Notes |
|------|--------|-------|
| Upload page + dropzone | ✅ | `AudioUploader` drag-drop + file picker |
| Call upload API | ✅ | `useAudioUpload` |
| Start transcription job | ✅ | `POST /api/transcripts` |
| Poll job | ✅ | `useJobPolling` (1s interval) |
| Navigate to transcript detail | ✅ | `JobProgress`, `PipelineStepper` |

**Acceptance:** Upload audio → transcribe → land on transcript detail when job completes.

---

## Milestone 6: Recording Flow — ✅

| Task | Status | Notes |
|------|--------|-------|
| AudioRecorder component | ✅ | Record/stop/pause controls |
| MediaRecorder hook | ✅ | `useAudioRecorder` (`audio/webm` preferred) |
| Timer + preview | ✅ | `AudioPreview`, live `AudioWaveform` (Web Audio API) |
| Upload recording blob | ✅ | `source=recording` |
| Start transcription job | ✅ | Reuses upload + job polling flow |

**Acceptance:** Browser recording uploads as webm, transcribes, opens transcript detail.

---

## Milestone 7: Transcript Library and Editing — ✅

| Task | Status | Notes |
|------|--------|-------|
| Transcripts list page | ✅ | Search/filter, delete with confirmation |
| Transcript detail page | ✅ | Two-column layout with AI stub panel |
| Editable transcript | ✅ | `TranscriptEditor` |
| Save edits (PATCH) | ✅ | `TranscriptToolbar` |
| Copy / export TXT / MD | ✅ | `lib/export.ts` |
| In-progress transcript status | ✅ | `transcribing` placeholder + list auto-refresh |

**Acceptance:** List, open, edit, save, copy, export TXT/MD, delete transcripts. Pending jobs show “Transcribing…” in the list.

---

## Milestone 8: OpenRouter AI Actions — ⬜

| Task | Status |
|------|--------|
| LLM service | ⬜ |
| AI action endpoints | ⬜ |
| Prompt templates | ⬜ |
| Document model + creation | ⬜ |
| Job integration | ⬜ |
| `LLM_MOCK` mode | ⬜ |

---

## Milestone 9: Document Editor — ⬜

| Task | Status |
|------|--------|
| Document list + detail | ⬜ |
| Markdown editor + preview | ⬜ |
| Copy / export MD | ⬜ |

---

## Milestone 10: Polish and Stabilization — ⬜

| Task | Status |
|------|--------|
| Error messages / loading / empty states | 🚧 | Toasts, job failure UI, transcribing placeholders |
| Motion primitives | ⬜ | |
| Settings page | 🚧 | Health + privacy stub (Milestone 10 polish pending) |
| Privacy notice in UI | 🚧 | Settings page stub |
| Root README polish | ✅ | README + docs/ updated 2026-06-29 |

---

## Recommended next steps

1. **Milestone 8** — OpenRouter LLM service, AI action endpoints, document model.
2. **Milestone 9** — Document list/detail pages and Markdown editor.
3. Keep `ASR_MOCK=true` in CI; use real ASR only for manual/local testing.

---

## Out of scope (per SDD)

Real-time streaming ASR, speaker diarization, auth, cloud sync, PDF/DOCX export, mobile app, Obsidian plugin — see SDD Section 3.2.
