# Quickstart

Get the Finch backend running and transcribe your first audio file.

## Prerequisites

| Tool | Purpose |
|------|---------|
| [uv](https://docs.astral.sh/uv/) | Python package manager |
| [ffmpeg](https://ffmpeg.org/) | Audio normalization (16 kHz mono WAV) |

For real ASR (not mock mode), you also need enough disk space and RAM for [Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B) (~2B parameters).

## 1. Clone and configure

```bash
cd finch/backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Development with mock transcripts (no GPU/model download)
ASR_MOCK=true

# Real local transcription
ASR_MOCK=false
ASR_MODEL_ID=Qwen/Qwen3-ASR-1.7B
ASR_DEVICE=auto
HF_HOME=./data/hf_cache
```

## 2. Install and run

```bash
uv sync
uv run uvicorn app.main:app --reload
```

Verify:

```bash
curl http://localhost:8000/api/health
# {"status":"ok","app":"Finch"}
```

Interactive API docs: http://localhost:8000/docs

## 3. Transcribe via API

### Upload audio

```bash
curl -F "file=@../data/your-audio.mp3" -F "source=upload" \
  http://localhost:8000/api/audio/upload
```

Response includes `id` (e.g. `audio_abc123`).

### Start transcription job

```bash
curl -X POST http://localhost:8000/api/transcripts \
  -H "Content-Type: application/json" \
  -d '{"audioAssetId": "audio_abc123", "language": "auto"}'
```

Returns `jobId` and `transcriptId`. A placeholder transcript with `status: "transcribing"` is created immediately and appears in `GET /api/transcripts` while the job runs.

### Poll job status

```bash
curl http://localhost:8000/api/jobs/job_abc123
```

Wait until `"status": "completed"` and note `resultId` (transcript id).

### Read transcript

```bash
curl http://localhost:8000/api/transcripts/transcript_abc123
```

## 4. Transcribe via CLI script

With the server running in another terminal:

```bash
cd backend
uv run python scripts/transcribe_file.py ../data/your-audio.mp3
```

The script uploads, starts a job, polls until complete, prints the full transcript, and saves `your-audio.txt` next to the source file.

For long audio (>60s), the server prints each chunk as it completes:

```txt
[ASR chunk 12/101] 495.0s - 540.0s
Language: English
<chunk transcript text>
```

Watch the **uvicorn terminal** for chunk output.

## 5. Real ASR setup

```bash
cd backend
uv add torch qwen-asr   # already in pyproject.toml after uv sync
```

Set in `.env`:

```env
ASR_MOCK=false
HF_HOME=./data/hf_cache
```

First run downloads the model from Hugging Face. On Apple Silicon, `ASR_DEVICE=auto` selects MPS when available.

Optional pre-download:

```bash
uv run huggingface-cli download Qwen/Qwen3-ASR-1.7B --local-dir ./data/models/Qwen3-ASR-1.7B
```

Then set `ASR_MODEL_ID=./data/models/Qwen3-ASR-1.7B`.

## 6. Run the frontend

With the backend running on port 8000:

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. Use **Upload** or **Record** to transcribe audio; view and edit results under **Transcripts**. In-progress jobs appear in the list with a **Transcribing…** status until complete.

## 7. Run tests

```bash
cd backend
uv run pytest
```

Tests use `ASR_MOCK=true` and mock ffmpeg; no model download required.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ffmpeg is not installed` | Install ffmpeg (`brew install ffmpeg` on macOS) |
| Hugging Face permission error | Set `HF_HOME=./data/hf_cache` inside `backend/` |
| `Invalid buffer size` on long audio | Long files are chunked automatically (45s segments) |
| `Unsupported audio type: audio/webm;codecs=opus` | Fixed server-side; restart backend if you see this on recordings |
| Slow transcription | Expected for long files on CPU/MPS; ~100 chunks for 75 min audio |
