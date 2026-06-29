# Finch Software Design Document (SDD)

Version: 0.1.0  
Status: Draft for implementation  
Primary app name: Finch  
Product type: Local ASR transcription app with optional LLM-powered text enhancement  
Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Motion Primitives  
Backend: Python, FastAPI, uv, local Qwen3-ASR-1.7B, OpenRouter LLM endpoints  
Storage: SQLite for MVP, local filesystem for audio assets  
Primary principle: Audio becomes transcript first. LLM features are optional actions on transcript text.

---

# 1. Executive Summary

Finch is a local-first voice transcription and Markdown generation application.

The app allows users to:

1. Record voice directly in the browser.
2. Upload existing audio files.
3. Transcribe audio locally using Qwen3-ASR-1.7B.
4. View, edit, copy, and export transcripts as standalone artifacts.
5. Optionally apply LLM actions to transcript text through OpenRouter.
6. Generate Markdown documents such as summaries, meeting notes, action items, study notes, and cleaned notes.
7. Save transcripts and generated documents in a local library.

Finch must not force every transcription through an LLM. The transcription feature is a first-class standalone feature.

---

# 2. Product Principles

## 2.1 Core Principle

Finch should be designed as:

```txt
Audio → Transcript → Optional AI Documents
```

Not as:

```txt
Audio → AI Summary
```

The transcript is the source of truth.

## 2.2 Privacy Principle

ASR runs locally. Audio files are not sent to external services.

Only optional LLM actions send transcript text to OpenRouter. The UI must clearly indicate that LLM enhancement uses external model endpoints.

## 2.3 UX Principle

Finch should feel like a lightweight writing and note-taking app, not an enterprise AI dashboard.

The user experience should be:

- Calm
- Minimal
- Fast
- Trustworthy
- Markdown-native
- Local-first where possible

---

# 3. Product Scope

## 3.1 MVP Scope

The MVP must include:

- Browser voice recording
- Audio file upload
- Local ASR transcription using Qwen3-ASR-1.7B
- Standalone transcript library
- Transcript detail page
- Editable transcript text
- Copy transcript
- Export transcript as `.txt`
- Export transcript as simple `.md`
- Optional LLM action: summarize as Markdown
- Optional LLM action: extract action items
- Generated document library
- Markdown editor and preview for generated documents
- Basic settings page
- OpenRouter API key configured through backend environment variables
- uv-based Python project setup

## 3.2 Non-MVP Features

Do not implement these in the first version unless all MVP features are complete:

- Real-time streaming ASR
- Speaker diarization
- Team accounts
- Cloud sync
- PDF export
- DOCX export
- Mobile app
- Obsidian plugin
- Notion export
- Semantic search
- Local LLM summarization
- Collaboration
- Authentication
- Payment or subscription system

---

# 4. User Personas

## 4.1 Solo Builder / Developer

Uses Finch to dictate project notes, technical thoughts, architecture plans, and meeting summaries.

Needs:

- Fast voice capture
- Clean transcript
- Markdown export
- Action item extraction

## 4.2 Manager / Team Lead

Uses Finch for meetings, 1:1 notes, decision logs, and project discussions.

Needs:

- Meeting notes
- Key decisions
- Action items
- Risks
- Clear editable summaries

## 4.3 Learner / Researcher

Uses Finch for lectures, podcasts, voice memos, and study notes.

Needs:

- Accurate transcript
- Study notes
- Topic outline
- Key concepts
- Markdown archive

---

# 5. Core User Flows

## 5.1 Record Voice and Transcribe

```txt
User opens Finch
→ User clicks "Record"
→ Browser asks for microphone permission
→ User records voice
→ User stops recording
→ App shows audio preview
→ User clicks "Transcribe"
→ Audio is uploaded to FastAPI backend
→ Backend normalizes audio
→ Backend runs local Qwen3-ASR-1.7B
→ Backend creates transcript
→ Frontend navigates to transcript detail page
→ User edits, copies, or exports transcript
```

## 5.2 Upload Audio and Transcribe

```txt
User opens Finch
→ User clicks "Upload"
→ User drops or selects audio file
→ Frontend uploads file to backend
→ Backend stores original file
→ Backend normalizes audio
→ User clicks "Transcribe"
→ Backend runs local ASR job
→ Transcript is created
→ User opens transcript detail page
```

## 5.3 Apply LLM Action to Transcript

```txt
User opens transcript detail page
→ User clicks "AI Actions"
→ User selects "Summarize as Markdown"
→ Frontend sends transcript ID and action type to backend
→ Backend reads edited transcript if available, otherwise raw transcript
→ Backend calls OpenRouter
→ Backend creates generated document
→ Frontend opens document detail page
→ User edits Markdown, previews, copies, or exports
```

## 5.4 Extract Action Items

```txt
User opens transcript
→ User selects "Extract Action Items"
→ Backend sends transcript to OpenRouter
→ LLM returns Markdown checklist
→ Backend stores generated document
→ Frontend displays editable Markdown
```

---

# 6. System Architecture

## 6.1 High-Level Architecture

```txt
┌──────────────────────────────────────┐
│              Frontend                │
│ Next.js + TypeScript                 │
│ Tailwind CSS + shadcn/ui             │
│ Motion Primitives                    │
│                                      │
│ - Record audio                       │
│ - Upload audio                       │
│ - Display job progress               │
│ - Edit transcript                    │
│ - Run AI actions                     │
│ - Edit/preview Markdown              │
└───────────────────┬──────────────────┘
                    │ HTTP / polling
                    ▼
┌──────────────────────────────────────┐
│              Backend                 │
│ FastAPI + uv                         │
│                                      │
│ - Audio upload                       │
│ - Audio normalization                │
│ - Local ASR job processing           │
│ - Transcript persistence             │
│ - OpenRouter LLM integration         │
│ - Document generation                │
│ - Job status tracking                │
└───────────────┬──────────────┬───────┘
                │              │
                ▼              ▼
┌──────────────────────┐   ┌──────────────────────┐
│ Local ASR Runtime     │   │ OpenRouter            │
│ Qwen3-ASR-1.7B        │   │ LLM endpoints         │
│ PyTorch/Transformers  │   │ Optional AI features  │
└──────────────────────┘   └──────────────────────┘

┌──────────────────────────────────────┐
│              Storage                 │
│ SQLite + local filesystem            │
│                                      │
│ - Audio metadata                     │
│ - Audio files                        │
│ - Normalized audio                   │
│ - Transcripts                        │
│ - Generated documents                │
│ - Jobs                               │
└──────────────────────────────────────┘
```

## 6.2 Backend Responsibilities

The backend owns:

- Model loading
- ASR execution
- Audio preprocessing
- File storage
- Database persistence
- LLM calls
- Job state
- API contracts

The frontend must not:

- Access local ASR directly
- Store OpenRouter API key
- Call OpenRouter directly
- Assume a specific audio file format

## 6.3 Frontend Responsibilities

The frontend owns:

- User interaction
- Recording through browser APIs
- File upload UI
- Transcript editing
- Markdown editing and preview
- Job polling
- Navigation
- Export/download UI

---

# 7. Repository Structure

Use a monorepo.

```txt
finch/
  README.md
  .gitignore
  .env.example

  backend/
    pyproject.toml
    uv.lock
    README.md
    app/
      __init__.py
      main.py
      config.py

      api/
        __init__.py
        routes_audio.py
        routes_transcripts.py
        routes_ai_actions.py
        routes_documents.py
        routes_jobs.py
        routes_health.py

      core/
        __init__.py
        errors.py
        logging.py
        ids.py

      services/
        __init__.py
        audio_service.py
        asr_service.py
        transcript_service.py
        llm_service.py
        ai_action_service.py
        document_service.py
        job_service.py

      models/
        __init__.py
        audio_asset.py
        transcript.py
        document.py
        job.py

      schemas/
        __init__.py
        audio.py
        transcript.py
        document.py
        job.py
        ai_action.py

      storage/
        __init__.py
        database.py
        file_store.py

      prompts/
        summarize_markdown.md
        action_items.md
        meeting_notes.md
        clean_transcript.md
        study_notes.md

      workers/
        __init__.py
        transcription_worker.py
        ai_action_worker.py

    tests/
      test_health.py
      test_audio_upload.py
      test_transcript_api.py
      test_ai_actions.py

    data/
      audio/
        original/
        normalized/
      exports/

  frontend/
    package.json
    tsconfig.json
    next.config.ts
    tailwind.config.ts
    postcss.config.js
    components.json
    app/
      layout.tsx
      page.tsx
      record/
        page.tsx
      upload/
        page.tsx
      transcripts/
        page.tsx
        [id]/
          page.tsx
      documents/
        page.tsx
        [id]/
          page.tsx
      settings/
        page.tsx

    components/
      audio/
        AudioRecorder.tsx
        AudioUploader.tsx
        AudioPreview.tsx
        WaveformPlaceholder.tsx
      transcripts/
        TranscriptEditor.tsx
        TranscriptToolbar.tsx
        TranscriptList.tsx
        AiActionPanel.tsx
      documents/
        MarkdownEditor.tsx
        MarkdownPreview.tsx
        DocumentToolbar.tsx
        DocumentList.tsx
      jobs/
        JobProgress.tsx
        PipelineStepper.tsx
      layout/
        AppShell.tsx
        Sidebar.tsx
        Topbar.tsx
      ui/
        shadcn components

    lib/
      api.ts
      types.ts
      export.ts
      utils.ts

    hooks/
      useAudioUpload.ts
      useAudioRecorder.ts
      useJobPolling.ts
      useTranscripts.ts
      useDocuments.ts
      useAiActions.ts
```

---

# 8. Backend Design

## 8.1 Python Package Management

Use `uv`, not Conda.

Backend setup commands:

```bash
cd backend
uv init
uv add fastapi uvicorn[standard] pydantic pydantic-settings python-multipart httpx sqlalchemy sqlmodel
uv add torch transformers accelerate soundfile librosa
uv add --dev ruff pytest pytest-asyncio mypy
```

Run backend:

```bash
uv run uvicorn app.main:app --reload
```

Run tests:

```bash
uv run pytest
```

Run lint:

```bash
uv run ruff check .
```

Format:

```bash
uv run ruff format .
```

## 8.2 Environment Variables

Create `backend/.env`.

```env
APP_NAME=Finch
APP_ENV=development
DATABASE_URL=sqlite:///./finch.db

DATA_DIR=./data
ORIGINAL_AUDIO_DIR=./data/audio/original
NORMALIZED_AUDIO_DIR=./data/audio/normalized
EXPORT_DIR=./data/exports

OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=openai/gpt-4.1-mini

ASR_MODEL_ID=Qwen/Qwen3-ASR-1.7B
ASR_DEVICE=auto
ASR_DTYPE=auto

MAX_UPLOAD_MB=500
MAX_AUDIO_DURATION_SECONDS=7200
```

## 8.3 FastAPI App Initialization

File: `backend/app/main.py`

Responsibilities:

- Create FastAPI app
- Include routers
- Configure CORS for frontend dev server
- Initialize DB tables
- Expose health endpoint

Required routes:

```txt
/api/health
/api/audio
/api/transcripts
/api/ai-actions
/api/documents
/api/jobs
```

## 8.4 Configuration

File: `backend/app/config.py`

Use `pydantic-settings`.

Settings fields:

```python
class Settings(BaseSettings):
    app_name: str = "Finch"
    app_env: str = "development"

    database_url: str = "sqlite:///./finch.db"

    data_dir: str = "./data"
    original_audio_dir: str = "./data/audio/original"
    normalized_audio_dir: str = "./data/audio/normalized"
    export_dir: str = "./data/exports"

    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_default_model: str = "openai/gpt-4.1-mini"

    asr_model_id: str = "Qwen/Qwen3-ASR-1.7B"
    asr_device: str = "auto"
    asr_dtype: str = "auto"

    max_upload_mb: int = 500
    max_audio_duration_seconds: int = 7200
```

---

# 9. Backend Data Models

Use SQLModel for MVP.

## 9.1 AudioAsset

File: `backend/app/models/audio_asset.py`

```python
class AudioAsset(SQLModel, table=True):
    id: str = Field(primary_key=True)
    source: str
    filename: str
    mime_type: str
    size_bytes: int
    duration_seconds: float | None = None
    original_path: str
    normalized_path: str | None = None
    created_at: datetime
```

Allowed `source` values:

```txt
upload
recording
```

## 9.2 Transcript

File: `backend/app/models/transcript.py`

```python
class Transcript(SQLModel, table=True):
    id: str = Field(primary_key=True)
    audio_asset_id: str = Field(foreign_key="audioasset.id")
    title: str
    raw_text: str
    edited_text: str | None = None
    language: str | None = None
    status: str = "draft"
    created_at: datetime
    updated_at: datetime
```

Allowed `status` values:

```txt
draft
final
```

## 9.3 Document

File: `backend/app/models/document.py`

```python
class Document(SQLModel, table=True):
    id: str = Field(primary_key=True)
    transcript_id: str = Field(foreign_key="transcript.id")
    title: str
    type: str
    markdown: str
    model: str
    prompt_version: str
    created_at: datetime
    updated_at: datetime
```

Allowed `type` values:

```txt
markdown_summary
meeting_notes
action_items
clean_transcript
study_notes
custom
```

## 9.4 Job

File: `backend/app/models/job.py`

```python
class Job(SQLModel, table=True):
    id: str = Field(primary_key=True)
    type: str
    status: str
    progress: float = 0.0
    stage: str | None = None
    result_id: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
```

Allowed `type` values:

```txt
transcription
ai_action
```

Allowed `status` values:

```txt
queued
processing
completed
failed
```

---

# 10. Backend API Specification

## 10.1 Health

### GET `/api/health`

Response:

```json
{
  "status": "ok",
  "app": "Finch"
}
```

Acceptance criteria:

- Must return HTTP 200
- Must not require database access
- Used by frontend to check backend availability

---

## 10.2 Upload Audio

### POST `/api/audio/upload`

Content type:

```txt
multipart/form-data
```

Fields:

```txt
file: audio file
source: upload | recording
```

Response:

```json
{
  "id": "audio_abc123",
  "source": "upload",
  "filename": "meeting.m4a",
  "mimeType": "audio/mp4",
  "sizeBytes": 12345678,
  "durationSeconds": 320.5,
  "createdAt": "2026-06-29T10:00:00Z"
}
```

Validation:

- Reject empty file
- Reject unsupported file types
- Reject files larger than `MAX_UPLOAD_MB`
- Store original file in `data/audio/original`
- Normalize audio to `16kHz mono WAV` in `data/audio/normalized`

Supported MIME types:

```txt
audio/wav
audio/x-wav
audio/mpeg
audio/mp4
audio/m4a
audio/webm
audio/ogg
audio/flac
```

Implementation note:

Browser recordings may arrive as `audio/webm`. The backend must normalize with ffmpeg before ASR.

---

## 10.3 Get Audio Asset

### GET `/api/audio/{audio_id}`

Response:

```json
{
  "id": "audio_abc123",
  "source": "recording",
  "filename": "recording-2026-06-29.webm",
  "mimeType": "audio/webm",
  "sizeBytes": 12345678,
  "durationSeconds": 180.2,
  "createdAt": "2026-06-29T10:00:00Z"
}
```

---

## 10.4 Delete Audio Asset

### DELETE `/api/audio/{audio_id}`

Behavior:

- Delete database record
- Delete original audio file if present
- Delete normalized audio file if present
- Do not delete transcript automatically in MVP unless explicitly implemented with cascade confirmation

Response:

```json
{
  "ok": true
}
```

---

## 10.5 Create Transcript Job

### POST `/api/transcripts`

Request:

```json
{
  "audioAssetId": "audio_abc123",
  "language": "auto"
}
```

Response:

```json
{
  "jobId": "job_abc123",
  "status": "queued"
}
```

Behavior:

- Create job with type `transcription`
- Start background transcription
- Return job immediately
- Frontend polls `/api/jobs/{job_id}`

---

## 10.6 List Transcripts

### GET `/api/transcripts`

Response:

```json
{
  "items": [
    {
      "id": "transcript_abc123",
      "audioAssetId": "audio_abc123",
      "title": "Weekly Product Sync",
      "language": "en",
      "createdAt": "2026-06-29T10:10:00Z",
      "updatedAt": "2026-06-29T10:20:00Z"
    }
  ]
}
```

---

## 10.7 Get Transcript

### GET `/api/transcripts/{transcript_id}`

Response:

```json
{
  "id": "transcript_abc123",
  "audioAssetId": "audio_abc123",
  "title": "Weekly Product Sync",
  "rawText": "Raw transcript text...",
  "editedText": "Corrected transcript text...",
  "language": "en",
  "status": "draft",
  "createdAt": "2026-06-29T10:10:00Z",
  "updatedAt": "2026-06-29T10:20:00Z"
}
```

---

## 10.8 Update Transcript

### PATCH `/api/transcripts/{transcript_id}`

Request:

```json
{
  "title": "New title",
  "editedText": "Updated transcript text",
  "status": "final"
}
```

Response:

```json
{
  "id": "transcript_abc123",
  "title": "New title",
  "editedText": "Updated transcript text",
  "status": "final",
  "updatedAt": "2026-06-29T10:25:00Z"
}
```

Rules:

- `title` optional
- `editedText` optional
- `status` optional
- Empty `editedText` is allowed
- `updatedAt` must change on update

---

## 10.9 Delete Transcript

### DELETE `/api/transcripts/{transcript_id}`

Behavior:

- Delete transcript
- Delete generated documents linked to transcript or reject deletion if documents exist
- MVP recommendation: cascade delete documents linked to transcript

Response:

```json
{
  "ok": true
}
```

---

## 10.10 AI Action Templates

### GET `/api/ai-actions/templates`

Response:

```json
{
  "items": [
    {
      "id": "markdown_summary",
      "name": "Markdown Summary",
      "description": "Generate a structured Markdown summary."
    },
    {
      "id": "action_items",
      "name": "Action Items",
      "description": "Extract action items as Markdown checkboxes."
    },
    {
      "id": "meeting_notes",
      "name": "Meeting Notes",
      "description": "Generate meeting notes with decisions, risks, and next steps."
    },
    {
      "id": "clean_transcript",
      "name": "Clean Transcript",
      "description": "Clean grammar and formatting while preserving meaning."
    },
    {
      "id": "study_notes",
      "name": "Study Notes",
      "description": "Create study notes from lecture or learning content."
    }
  ]
}
```

---

## 10.11 Create AI Action Job

### POST `/api/ai-actions`

Request:

```json
{
  "transcriptId": "transcript_abc123",
  "action": "markdown_summary",
  "source": "editedText",
  "model": "openai/gpt-4.1-mini",
  "customPrompt": null
}
```

Fields:

- `transcriptId`: required
- `action`: required
- `source`: `rawText` or `editedText`
- `model`: optional, use default if missing
- `customPrompt`: optional, only used when action is `custom`

Response:

```json
{
  "jobId": "job_def456",
  "status": "queued"
}
```

Behavior:

- Read transcript
- If source is `editedText` but transcript has no edited text, fall back to `rawText`
- Send selected text to OpenRouter
- Store generated Markdown as Document
- Set job result ID to created document ID

---

## 10.12 List Documents

### GET `/api/documents`

Response:

```json
{
  "items": [
    {
      "id": "doc_abc123",
      "transcriptId": "transcript_abc123",
      "title": "Weekly Product Sync Summary",
      "type": "markdown_summary",
      "model": "openai/gpt-4.1-mini",
      "createdAt": "2026-06-29T10:30:00Z",
      "updatedAt": "2026-06-29T10:35:00Z"
    }
  ]
}
```

---

## 10.13 Get Document

### GET `/api/documents/{document_id}`

Response:

```json
{
  "id": "doc_abc123",
  "transcriptId": "transcript_abc123",
  "title": "Weekly Product Sync Summary",
  "type": "markdown_summary",
  "markdown": "# Weekly Product Sync Summary\n\n## Summary\n...",
  "model": "openai/gpt-4.1-mini",
  "promptVersion": "v1",
  "createdAt": "2026-06-29T10:30:00Z",
  "updatedAt": "2026-06-29T10:35:00Z"
}
```

---

## 10.14 Update Document

### PATCH `/api/documents/{document_id}`

Request:

```json
{
  "title": "Updated title",
  "markdown": "# Updated Markdown"
}
```

Response:

```json
{
  "id": "doc_abc123",
  "title": "Updated title",
  "markdown": "# Updated Markdown",
  "updatedAt": "2026-06-29T10:40:00Z"
}
```

---

## 10.15 Delete Document

### DELETE `/api/documents/{document_id}`

Response:

```json
{
  "ok": true
}
```

---

## 10.16 Get Job

### GET `/api/jobs/{job_id}`

Response while processing:

```json
{
  "id": "job_abc123",
  "type": "transcription",
  "status": "processing",
  "progress": 0.65,
  "stage": "running_asr",
  "resultId": null,
  "error": null,
  "createdAt": "2026-06-29T10:00:00Z",
  "updatedAt": "2026-06-29T10:05:00Z"
}
```

Response when completed:

```json
{
  "id": "job_abc123",
  "type": "transcription",
  "status": "completed",
  "progress": 1.0,
  "stage": "completed",
  "resultId": "transcript_abc123",
  "error": null,
  "createdAt": "2026-06-29T10:00:00Z",
  "updatedAt": "2026-06-29T10:08:00Z"
}
```

Response when failed:

```json
{
  "id": "job_abc123",
  "type": "transcription",
  "status": "failed",
  "progress": 0.4,
  "stage": "running_asr",
  "resultId": null,
  "error": "ASR model failed to load",
  "createdAt": "2026-06-29T10:00:00Z",
  "updatedAt": "2026-06-29T10:08:00Z"
}
```

---

# 11. Audio Processing Design

## 11.1 Input Types

The backend must support both:

1. Uploaded files
2. Browser-recorded audio blobs

Both should be represented as `AudioAsset`.

## 11.2 Audio Normalization

All audio must be normalized before ASR.

Target format:

```txt
WAV
16kHz
Mono
PCM
```

Use `ffmpeg`.

Pseudo command:

```bash
ffmpeg -i input.webm -ar 16000 -ac 1 -c:a pcm_s16le output.wav
```

## 11.3 Audio Service

File: `backend/app/services/audio_service.py`

Responsibilities:

- Validate uploaded file
- Save original file
- Create AudioAsset record
- Normalize audio
- Extract duration
- Return AudioAsset

Required methods:

```python
class AudioService:
    def save_upload(file: UploadFile, source: str) -> AudioAsset: ...
    def normalize_audio(audio_asset: AudioAsset) -> AudioAsset: ...
    def get_duration(path: str) -> float | None: ...
    def delete_audio(audio_asset: AudioAsset) -> None: ...
```

## 11.4 Error Handling

Common errors:

- Unsupported MIME type
- File too large
- ffmpeg missing
- ffmpeg normalization failure
- Audio duration too long
- Empty audio
- File not found

Return structured errors:

```json
{
  "error": {
    "code": "AUDIO_NORMALIZATION_FAILED",
    "message": "Could not normalize audio file."
  }
}
```

---

# 12. ASR Design

## 12.1 ASR Service

File: `backend/app/services/asr_service.py`

Responsibilities:

- Lazy-load Qwen3-ASR-1.7B
- Run transcription on normalized WAV files
- Return text and optional language metadata
- Avoid reloading model for every request

Required interface:

```python
class AsrService:
    def load_model(self) -> None: ...
    def transcribe(self, audio_path: str, language: str = "auto") -> AsrResult: ...
```

`AsrResult`:

```python
class AsrResult(BaseModel):
    text: str
    language: str | None = None
    duration_seconds: float | None = None
```

## 12.2 Model Loading

The model should be loaded lazily on first transcription request.

Reasons:

- Faster backend startup
- Cleaner health checks
- Easier debugging

However, provide optional warmup later.

## 12.3 Device Selection

`ASR_DEVICE=auto` should choose:

1. CUDA if available
2. MPS if available on macOS and supported by dependencies
3. CPU fallback

Pseudo logic:

```python
if torch.cuda.is_available():
    device = "cuda"
elif torch.backends.mps.is_available():
    device = "mps"
else:
    device = "cpu"
```

## 12.4 ASR Job Flow

```txt
Create transcript job
→ Set job status processing
→ Set stage loading_model
→ Load ASR model if needed
→ Set stage running_asr
→ Run transcription
→ Set stage saving_transcript
→ Create Transcript
→ Set job resultId = transcript.id
→ Set status completed
```

## 12.5 Long Audio

For MVP:

- Support up to `MAX_AUDIO_DURATION_SECONDS`
- If model or runtime cannot handle long audio, add chunking later
- For now, fail gracefully with a readable error if duration exceeds configured limit

Future chunking:

```txt
Normalize audio
→ Split into 45s chunks with 3s overlap
→ Transcribe chunks sequentially
→ Merge text
→ Save transcript
```

---

# 13. LLM / OpenRouter Design

## 13.1 LLM Service

File: `backend/app/services/llm_service.py`

Responsibilities:

- Call OpenRouter chat completions API
- Hide API key from frontend
- Support configurable model
- Return generated text
- Handle errors and timeouts

Required interface:

```python
class LlmService:
    async def chat_completion(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.2,
    ) -> str: ...
```

## 13.2 AI Action Service

File: `backend/app/services/ai_action_service.py`

Responsibilities:

- Choose transcript text source
- Load prompt template
- Call LLM service
- Create Document
- Update Job

Required actions:

```txt
markdown_summary
action_items
meeting_notes
clean_transcript
study_notes
custom
```

## 13.3 Prompt Requirements

All prompts must include:

```txt
Do not invent facts.
If something is unclear, mark it as unclear.
Preserve names, technical terms, dates, and decisions.
Return valid Markdown only.
Do not wrap output in code fences.
```

## 13.4 Prompt: Markdown Summary

File: `backend/app/prompts/summarize_markdown.md`

```md
You are Finch, a voice note assistant.

Transform the transcript into a concise Markdown summary.

Rules:
- Do not invent facts.
- Preserve important names, dates, numbers, and technical terms.
- If something is unclear, write "Unclear".
- Return Markdown only.
- Do not wrap the result in a code block.

Output format:

# Summary

## Overview

## Key Points

## Details

## Open Questions

Transcript:

{{TRANSCRIPT}}
```

## 13.5 Prompt: Action Items

File: `backend/app/prompts/action_items.md`

```md
You are Finch, an assistant that extracts action items from transcripts.

Extract only action items that are supported by the transcript.

Rules:
- Use Markdown checkboxes.
- Include owner if clearly mentioned.
- Include deadline if clearly mentioned.
- Do not invent owners or deadlines.
- If no action items are found, write "No clear action items found."
- Return Markdown only.

Output format:

# Action Items

- [ ] Task — Owner: Unclear — Deadline: Unclear

Transcript:

{{TRANSCRIPT}}
```

## 13.6 Prompt: Meeting Notes

File: `backend/app/prompts/meeting_notes.md`

```md
You are Finch, a meeting note assistant.

Create structured meeting notes from the transcript.

Rules:
- Do not invent facts.
- Preserve decisions, names, dates, and technical terms.
- Mark unclear items as "Unclear".
- Return Markdown only.
- Do not wrap the result in a code block.

Output format:

# Meeting Notes

## Executive Summary

## Key Decisions

## Action Items

## Risks / Blockers

## Open Questions

## Detailed Notes

Transcript:

{{TRANSCRIPT}}
```

## 13.7 Prompt: Clean Transcript

File: `backend/app/prompts/clean_transcript.md`

```md
You are Finch, a transcript cleanup assistant.

Clean the transcript for readability.

Rules:
- Preserve the original meaning.
- Do not summarize.
- Do not add new facts.
- Fix obvious punctuation and paragraph breaks.
- Preserve names, dates, numbers, and technical terms.
- Return Markdown only.

Output format:

# Clean Transcript

{{CLEANED_TRANSCRIPT}}

Transcript:

{{TRANSCRIPT}}
```

## 13.8 Prompt: Study Notes

File: `backend/app/prompts/study_notes.md`

```md
You are Finch, a study note assistant.

Convert the transcript into useful study notes.

Rules:
- Do not invent facts.
- Preserve important terminology.
- Use concise Markdown.
- Return Markdown only.

Output format:

# Study Notes

## Overview

## Key Concepts

## Important Details

## Examples

## Questions to Review

## Summary

Transcript:

{{TRANSCRIPT}}
```

---

# 14. Frontend Design

## 14.1 Frontend Stack

Use:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Motion Primitives
- TanStack Query

Routing recommendation:

Use Next.js App Router for MVP.

Do not add TanStack Router unless intentionally replacing Next.js routing with a client-router architecture. If TanStack Router is required, consider Vite or TanStack Start instead.

## 14.2 Frontend Pages

Required pages:

```txt
/
 /record
 /upload
 /transcripts
 /transcripts/[id]
 /documents
 /documents/[id]
 /settings
```

## 14.3 Home Page

Purpose:

- Introduce Finch
- Provide quick entry points
- Show recent transcripts and documents

Components:

- Hero
- Primary CTA: Record Voice
- Secondary CTA: Upload Audio
- RecentTranscriptList
- RecentDocumentList

## 14.4 Record Page

Purpose:

Record voice directly in the app.

Required features:

- Microphone permission request
- Start recording
- Pause recording if supported
- Stop recording
- Timer
- Audio preview
- Upload recording
- Start transcription
- Navigate to transcript when job completes

Use custom hook:

```ts
useAudioRecorder()
```

Hook state:

```ts
type RecorderState =
  | "idle"
  | "permission-requested"
  | "recording"
  | "paused"
  | "stopped"
  | "uploading"
  | "error"
```

Hook return:

```ts
{
  state: RecorderState
  durationSeconds: number
  audioBlob: Blob | null
  audioUrl: string | null
  error: string | null
  start: () => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
}
```

MediaRecorder constraints:

```ts
{
  audio: true
}
```

Preferred MIME type:

```ts
audio/webm
```

Fallback:

Use browser default if `audio/webm` is unsupported.

## 14.5 Upload Page

Purpose:

Upload existing audio files.

Required features:

- Drag-and-drop zone
- File picker
- File metadata preview
- Upload progress
- Start transcription
- Error messages for invalid files

Supported extensions:

```txt
.wav
.mp3
.m4a
.webm
.ogg
.flac
```

## 14.6 Transcripts List Page

Purpose:

Show all transcripts.

Required features:

- List transcript cards
- Search by title or text snippet
- Show created date
- Show language if available
- Open transcript
- Delete transcript

## 14.7 Transcript Detail Page

This is the core page.

Layout:

```txt
┌──────────────────────────────────────────────┐
│ Title                                        │
│ [Save] [Copy] [Export TXT] [Export MD]       │
├──────────────────────────────┬───────────────┤
│ Editable Transcript           │ AI Actions    │
│                               │               │
│                               │ Summary       │
│                               │ Action Items  │
│                               │ Meeting Notes │
│                               │ Clean Text    │
│                               │ Study Notes   │
└──────────────────────────────┴───────────────┘
```

Required features:

- Edit title
- Edit transcript
- Save changes
- Copy transcript
- Export `.txt`
- Export simple `.md`
- Run AI action
- Show linked generated documents

## 14.8 Documents List Page

Purpose:

Show all generated documents.

Required features:

- List document cards
- Filter by type
- Search by title or content snippet
- Open document
- Delete document

## 14.9 Document Detail Page

Purpose:

Edit generated Markdown.

Layout:

```txt
┌─────────────────────────────┬─────────────────────────────┐
│ Markdown Editor             │ Markdown Preview            │
└─────────────────────────────┴─────────────────────────────┘
```

Required features:

- Edit title
- Edit Markdown
- Save document
- Copy Markdown
- Export `.md`
- Preview rendered Markdown

## 14.10 Settings Page

Required settings:

- Backend health status
- OpenRouter model name
- ASR model ID display
- Local-only ASR notice
- LLM privacy notice

MVP note:

OpenRouter API key should not be entered in frontend for MVP. It should be configured in backend `.env`.

---

# 15. Frontend Types

File: `frontend/lib/types.ts`

```ts
export type AudioAsset = {
  id: string
  source: "upload" | "recording"
  filename: string
  mimeType: string
  sizeBytes: number
  durationSeconds?: number
  createdAt: string
}

export type Transcript = {
  id: string
  audioAssetId: string
  title: string
  rawText: string
  editedText?: string | null
  language?: string | null
  status: "draft" | "final"
  createdAt: string
  updatedAt: string
}

export type Document = {
  id: string
  transcriptId: string
  title: string
  type:
    | "markdown_summary"
    | "meeting_notes"
    | "action_items"
    | "clean_transcript"
    | "study_notes"
    | "custom"
  markdown: string
  model: string
  promptVersion: string
  createdAt: string
  updatedAt: string
}

export type Job = {
  id: string
  type: "transcription" | "ai_action"
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  stage?: string | null
  resultId?: string | null
  error?: string | null
  createdAt: string
  updatedAt: string
}
```

---

# 16. Frontend API Client

File: `frontend/lib/api.ts`

Base URL:

```ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
```

Required functions:

```ts
export async function uploadAudio(file: File, source: "upload" | "recording"): Promise<AudioAsset>

export async function createTranscriptJob(input: {
  audioAssetId: string
  language?: string
}): Promise<{ jobId: string; status: string }>

export async function getJob(jobId: string): Promise<Job>

export async function listTranscripts(): Promise<{ items: Transcript[] }>

export async function getTranscript(id: string): Promise<Transcript>

export async function updateTranscript(
  id: string,
  input: Partial<Pick<Transcript, "title" | "editedText" | "status">>
): Promise<Transcript>

export async function createAiActionJob(input: {
  transcriptId: string
  action: Document["type"]
  source: "rawText" | "editedText"
  model?: string
  customPrompt?: string
}): Promise<{ jobId: string; status: string }>

export async function listDocuments(): Promise<{ items: Document[] }>

export async function getDocument(id: string): Promise<Document>

export async function updateDocument(
  id: string,
  input: Partial<Pick<Document, "title" | "markdown">>
): Promise<Document>
```

---

# 17. Job Polling

Use polling for MVP.

Hook:

```ts
useJobPolling(jobId, options)
```

Behavior:

- Poll every 1000ms while status is queued or processing
- Stop when completed or failed
- If completed and resultId exists, call `onCompleted(resultId)`
- If failed, call `onFailed(error)`

Pseudo signature:

```ts
function useJobPolling(
  jobId: string | null,
  options?: {
    enabled?: boolean
    onCompleted?: (job: Job) => void
    onFailed?: (job: Job) => void
  }
)
```

---

# 18. Export Design

## 18.1 Export Transcript as TXT

Content:

```txt
{transcript title}

{transcript text}
```

Use `editedText` if available, otherwise `rawText`.

## 18.2 Export Transcript as MD

Content:

```md
# {transcript title}

## Transcript

{transcript text}
```

## 18.3 Export Document as MD

Content:

Use document markdown as-is.

Frontend implementation:

- Create Blob
- Create object URL
- Trigger download
- Revoke object URL

File names:

```txt
finch-transcript-{title}.txt
finch-transcript-{title}.md
finch-document-{title}.md
```

Sanitize filenames.

---

# 19. Error Handling

## 19.1 Backend Error Format

All backend errors should follow:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Common error codes:

```txt
AUDIO_FILE_TOO_LARGE
AUDIO_UNSUPPORTED_TYPE
AUDIO_NORMALIZATION_FAILED
AUDIO_DURATION_TOO_LONG
AUDIO_NOT_FOUND

TRANSCRIPT_NOT_FOUND
TRANSCRIPTION_FAILED

DOCUMENT_NOT_FOUND

JOB_NOT_FOUND
JOB_FAILED

OPENROUTER_API_KEY_MISSING
OPENROUTER_REQUEST_FAILED
OPENROUTER_TIMEOUT

ASR_MODEL_LOAD_FAILED
ASR_TRANSCRIPTION_FAILED
```

## 19.2 Frontend Error Display

Frontend should show:

- Toast for short errors
- Inline error panel for job failures
- Retry button when possible
- Clear message when backend is offline

Do not display Python stack traces to users.

---

# 20. Security and Privacy

## 20.1 Local ASR

- ASR is local.
- Audio files remain on the local backend machine.
- Transcripts are stored locally.

## 20.2 External LLM

- LLM actions send transcript text to OpenRouter.
- The UI must disclose this.

Recommended UI copy:

```txt
ASR transcription runs locally. AI actions send selected transcript text to your configured LLM provider through OpenRouter.
```

## 20.3 API Key

For MVP:

- Store OpenRouter API key in backend `.env`
- Do not expose it to frontend
- Do not send it to the browser
- Do not log it

## 20.4 File Safety

- Validate file size
- Validate MIME type and extension
- Store files under controlled data directory
- Prevent path traversal
- Generate internal IDs for saved file names

---

# 21. Testing Strategy

## 21.1 Backend Tests

Required tests:

```txt
GET /api/health returns ok
POST /api/audio/upload rejects invalid file
POST /api/audio/upload stores valid file
POST /api/transcripts creates job
GET /api/jobs/{id} returns job
PATCH /api/transcripts/{id} updates title and editedText
POST /api/ai-actions rejects if OpenRouter API key missing
GET /api/documents returns list
```

Mock these in tests:

- ASR model
- OpenRouter call
- ffmpeg call where appropriate

## 21.2 Frontend Tests

For MVP, simple manual testing is acceptable.

Manual test checklist:

```txt
Can open home page
Can record audio
Can stop recording
Can preview recording
Can upload recording
Can upload audio file
Can start transcription
Can see job progress
Can open generated transcript
Can edit transcript
Can copy transcript
Can export TXT
Can export MD
Can run AI summary
Can open generated document
Can edit Markdown
Can preview Markdown
Can export generated Markdown
```

---

# 22. Development Milestones

## Milestone 1: Backend Skeleton

Tasks:

- Create backend with uv
- Add FastAPI
- Add health route
- Add settings
- Add SQLite setup
- Add base models
- Add CORS

Acceptance criteria:

- `uv run uvicorn app.main:app --reload` works
- `/api/health` returns ok
- SQLite DB initializes

## Milestone 2: Audio Upload and Storage

Tasks:

- Add audio upload endpoint
- Save original audio file
- Normalize with ffmpeg
- Create AudioAsset DB record
- Return metadata

Acceptance criteria:

- Upload `.webm`, `.mp3`, `.wav`
- Normalized WAV is created
- AudioAsset appears in DB

## Milestone 3: Transcription Pipeline

Tasks:

- Add ASR service
- Add transcript job creation
- Add job status
- Add transcript creation
- Add transcript detail endpoint

Acceptance criteria:

- Upload audio
- Create transcription job
- Job completes
- Transcript is stored
- Transcript can be fetched

## Milestone 4: Frontend Skeleton

Tasks:

- Create Next.js frontend
- Add Tailwind
- Add shadcn/ui
- Add app shell
- Add pages
- Add API client

Acceptance criteria:

- Frontend loads
- Navigation works
- Backend health shown

## Milestone 5: Upload Flow

Tasks:

- Add upload page
- Add file picker/dropzone
- Call upload API
- Start transcription job
- Poll job
- Navigate to transcript detail

Acceptance criteria:

- User can upload audio and receive transcript

## Milestone 6: Recording Flow

Tasks:

- Add AudioRecorder
- Use MediaRecorder
- Show timer
- Stop and preview audio
- Upload audio blob
- Start transcription job

Acceptance criteria:

- User can record directly in app and transcribe recording

## Milestone 7: Transcript Library and Editing

Tasks:

- Add transcripts list
- Add transcript detail
- Add editable transcript
- Save transcript edits
- Copy/export transcript

Acceptance criteria:

- User can manage transcripts as standalone artifacts

## Milestone 8: OpenRouter AI Actions

Tasks:

- Add LLM service
- Add AI action endpoint
- Add prompt templates
- Add document creation
- Add job status integration

Acceptance criteria:

- User can generate Markdown summary from transcript
- User can generate action items from transcript

## Milestone 9: Document Editor

Tasks:

- Add document list
- Add document detail
- Add Markdown editor
- Add Markdown preview
- Add copy/export Markdown

Acceptance criteria:

- User can view, edit, preview, and export generated Markdown

## Milestone 10: Polish and Stabilization

Tasks:

- Improve error messages
- Add loading states
- Add empty states
- Add motion primitives
- Add settings page
- Add privacy notice
- Add README

Acceptance criteria:

- App feels usable as a beta
- Common failure paths are handled

---

# 23. Implementation Notes for Codex

## 23.1 Important Build Order

Codex should implement in this order:

1. Backend health + config + database
2. Backend models + schemas
3. Audio upload + local file storage
4. Job model + job endpoints
5. Mock ASR service first
6. Transcript creation flow
7. Replace mock ASR with Qwen3-ASR integration
8. Frontend shell + pages
9. Upload flow
10. Recording flow
11. Transcript editing/export
12. OpenRouter LLM service
13. AI actions
14. Document editor/export
15. Polish

## 23.2 Use Mock ASR First

To avoid blocking frontend development on model setup, implement a mock ASR mode.

Environment variable:

```env
ASR_MOCK=true
```

If enabled, return:

```txt
This is a mock transcript generated by Finch.
```

This allows full end-to-end development before model integration.

## 23.3 Use Mock LLM First

Environment variable:

```env
LLM_MOCK=true
```

If enabled, return a simple Markdown document.

Example:

```md
# Mock Summary

## Overview

This is a mock AI-generated summary.

## Action Items

- [ ] Replace mock LLM with OpenRouter integration.
```

## 23.4 Avoid Overengineering

For MVP:

- Use SQLite
- Use polling
- Use in-process background tasks
- Use simple textarea editor
- Use simple Markdown preview
- No auth
- No cloud sync
- No Docker required initially

---

# 24. Acceptance Criteria for MVP

The MVP is complete when all of the following are true:

## Backend

- `uv run uvicorn app.main:app --reload` starts backend
- `/api/health` works
- Audio upload works for `.webm`, `.mp3`, and `.wav`
- Browser recording upload works
- Audio files are normalized
- Transcription job can be created
- Job status can be polled
- Transcript is created from ASR output
- Transcript can be listed, read, edited, and deleted
- AI action job can be created
- OpenRouter integration generates Markdown
- Document can be listed, read, edited, and deleted

## Frontend

- User can open app
- User can record audio
- User can upload audio
- User can preview recorded audio
- User can start transcription
- User can see job progress
- User can open transcript
- User can edit transcript
- User can copy transcript
- User can export transcript as TXT
- User can export transcript as MD
- User can run AI summary
- User can run action item extraction
- User can open generated document
- User can edit Markdown
- User can preview Markdown
- User can export Markdown

## Product

- Transcription works as standalone feature
- LLM features are optional
- UI clearly separates transcript from generated document
- Privacy notice explains local ASR and external LLM actions
- App is usable without LLM if OpenRouter API key is missing

---

# 25. README Requirements

Root README should include:

```txt
# Finch

Finch is a local ASR transcription and Markdown note generation app.

## Features

- Record voice in browser
- Upload audio files
- Transcribe locally with Qwen3-ASR-1.7B
- Edit and export transcripts
- Generate Markdown summaries with OpenRouter
- Extract action items
- Save transcripts and generated documents

## Development

### Backend

cd backend
uv sync
uv run uvicorn app.main:app --reload

### Frontend

cd frontend
npm install
npm run dev

## Environment

Copy .env.example to backend/.env and configure OpenRouter API key.

## Privacy

Audio transcription runs locally. Optional AI actions send transcript text to OpenRouter.
```

---

# 26. Future Roadmap

After MVP:

## 26.1 Real-Time Transcription

- Stream microphone audio to backend
- Partial ASR results
- Live transcript updates

## 26.2 Speaker Diarization

- Identify speakers
- Label transcript segments
- Improve meeting notes

## 26.3 Timestamped Transcript

- Add segment-level timestamps
- Click transcript to play audio from timestamp

## 26.4 Local LLM Mode

- Use Ollama, llama.cpp, LM Studio, or vLLM
- Fully local transcript + summary mode

## 26.5 Search

- Full-text search over transcripts and documents
- Later semantic search

## 26.6 Export

- PDF
- DOCX
- HTML
- Obsidian vault
- Notion Markdown

---

# 27. Final Design Summary

Finch is a voice-to-text-first application.

The most important product decision is to keep transcription independent from summarization.

The app should treat the transcript as the durable artifact and AI-generated Markdown as optional derived documents.

Correct mental model:

```txt
AudioAsset
  ↓
Transcript
  ↓
Document(s)
```

This gives the product strong flexibility:

- Users can use Finch as a pure transcription tool.
- Users can apply LLM actions only when needed.
- Users can generate multiple different documents from the same transcript.
- Users can preserve the original transcript as the source of truth.
- The app remains useful even when OpenRouter is not configured.

End of SDD.
