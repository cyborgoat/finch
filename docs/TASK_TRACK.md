# Finch Task Track

Living checklist aligned with [finch_sdd_spec.md](../finch_sdd_spec.md) Section 22 (Development Milestones).

**Last updated:** 2026-06-29  
**Overall:** Backend milestones 1–3 complete. Milestones 4–10 not started.

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

## Milestone 4: Frontend Skeleton — ⬜

| Task | Status |
|------|--------|
| Create Next.js frontend | ⬜ |
| Add Tailwind | ⬜ |
| Add shadcn/ui | ⬜ |
| Add app shell | ⬜ |
| Add pages (stubs) | ⬜ |
| Add API client | ⬜ |

---

## Milestone 5: Upload Flow — ⬜

| Task | Status |
|------|--------|
| Upload page + dropzone | ⬜ |
| Call upload API | ⬜ |
| Start transcription job | ⬜ |
| Poll job | ⬜ |
| Navigate to transcript detail | ⬜ |

---

## Milestone 6: Recording Flow — ⬜

| Task | Status |
|------|--------|
| AudioRecorder component | ⬜ |
| MediaRecorder hook | ⬜ |
| Timer + preview | ⬜ |
| Upload recording blob | ⬜ |
| Start transcription job | ⬜ |

---

## Milestone 7: Transcript Library and Editing — ⬜

| Task | Status |
|------|--------|
| Transcripts list page | ⬜ |
| Transcript detail page | ⬜ |
| Editable transcript | ⬜ |
| Save edits (PATCH) | ⬜ |
| Copy / export TXT / MD | ⬜ |

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
| Error messages / loading / empty states | ⬜ |
| Motion primitives | ⬜ |
| Settings page | ⬜ |
| Privacy notice in UI | ⬜ |
| Root README polish | 🚧 | README + docs/ added 2026-06-29 |

---

## Recommended next steps

1. **Milestone 4** — Scaffold `frontend/` with Next.js App Router, Tailwind, shadcn/ui, health check on home page.
2. **Milestone 5** — Wire upload page to existing backend APIs + job polling.
3. Keep `ASR_MOCK=true` in CI; use real ASR only for manual/local testing.

---

## Out of scope (per SDD)

Real-time streaming ASR, speaker diarization, auth, cloud sync, PDF/DOCX export, mobile app, Obsidian plugin — see SDD Section 3.2.
