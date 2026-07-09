# Speaker Diarization

Finch can label transcript segments by speaker using [pyannote-audio](https://github.com/pyannote/pyannote-audio). Diarization runs locally; only Hugging Face model downloads require network access.

Output format:

```txt
Speaker 1: Hello, thanks for joining.

Speaker 2: Happy to be here.
```

## Prerequisites

1. Qwen3-ASR installed (`uv add torch qwen-asr`) — diarization runs ASR per speaker segment
2. `pyannote-audio` installed: `cd backend && uv add pyannote-audio`
3. Hugging Face account with access to [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1)

## Setup

### 1. Accept model terms

1. Log in at [huggingface.co](https://huggingface.co/login)
2. Open [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1)
3. Click **Agree and access repository**

A **403 gated repo** error means this step was skipped — not a missing token.

### 2. Configure token and enable diarization

Create a **read** token at [hf.co/settings/tokens](https://huggingface.co/settings/tokens) for the **same account** that accepted the terms.

Set in **backend `.env`** (or repo root `.env`):

```env
DIARIZATION_ENABLED=true
HF_TOKEN=hf_...
```

Enable the diarization toggle in **Settings → Transcription** in the frontend (saved locally in SQLite). The Hugging Face token is **not** configured in the UI — only via `HF_TOKEN` in `.env`.

Alternatively: `huggingface-cli login` (Finch reads the CLI token when `HF_TOKEN` is unset).

### 3. Validate before transcribing

```bash
cd backend
uv run python scripts/validate_diarization.py
```

Optional — run diarization only on a sample file (no ASR):

```bash
uv run python scripts/validate_diarization.py --audio ../path/to/meeting.wav
```

The script checks config, dependencies, Hugging Face access, and optionally prints segment timing.

On backend startup, the uvicorn terminal prints diarization readiness. Use `GET /api/health` or startup logs to verify configuration.

## How it works

```txt
Upload → normalize WAV
  → optional: audio purification (denoise + VAD compress)
  → pyannote diarization (speaker turns)
  → remap timestamps to original timeline (when purification enabled)
  → merge/filter segments
  → ffmpeg slice per segment
  → Qwen3-ASR per segment
  → labeled transcript + speakerSegments JSON
```

If diarization fails (missing token, model access, pyannote error), the worker **falls back** to full-file ASR. Check Huey worker logs for details. Re-transcribe after fixing config.

## Audio purification

Optional pre-diarization step that removes silence and noise so pyannote runs on speech-only audio. This can improve diarization quality and speed on long meetings with dead air.

Enable in `.env`:

```env
AUDIO_PURIFICATION_ENABLED=true
```

### What it does

1. **Optional denoise** (`AUDIO_PURIFICATION_DENOISE=true`, default): ffmpeg `afftdn` on the diarization input.
2. **Silero VAD**: detect speech regions.
3. **Compress**: concatenate speech into a temporary WAV (silence removed).
4. **Diarize** the shorter file with pyannote.
5. **Remap** speaker-turn timestamps back to the original normalized timeline before ASR slicing and playback.

Purified audio is **not** stored permanently and does **not** change the audio player source. Compression details are logged in the Huey worker.

If purification fails or finds no speech, the pipeline falls back to the original audio for diarization.

### Purification tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUDIO_PURIFICATION_ENABLED` | `false` | Enable VAD compress before diarization |
| `AUDIO_PURIFICATION_DENOISE` | `true` | Apply ffmpeg noise reduction before VAD |
| `AUDIO_PURIFICATION_MIN_SPEECH_MS` | `250` | Minimum speech region length for Silero VAD |
| `AUDIO_PURIFICATION_MIN_SILENCE_MS` | `500` | Minimum silence between speech regions |
| `AUDIO_PURIFICATION_SPEECH_PAD_MS` | `100` | Pad VAD cuts to avoid clipping word edges |
| `AUDIO_PURIFICATION_MERGE_GAP_SECONDS` | `0.3` | Merge adjacent speech regions separated by smaller gaps |

Purification applies only when diarization is enabled. Full-file ASR (no diarization) is unchanged.

## Tuning

All tuning vars go in `.env`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DIARIZATION_USE_ORIGINAL_AUDIO` | `false` | Diarize the original upload instead of normalized 16 kHz mono WAV |
| `DIARIZATION_USE_EXCLUSIVE` | `true` | Use pyannote exclusive diarization (recommended — one speaker per instant) |
| `DIARIZATION_MIN_SEGMENT_SECONDS` | `0.3` | Drop segments shorter than this after merge |
| `DIARIZATION_MERGE_GAP_SECONDS` | `0.5` | Merge same-speaker turns separated by gaps ≤ this value |
| `DIARIZATION_MAX_SEGMENTS` | `0` | Cap segment count (`0` = unlimited); useful for very long files |

### Audio source: normalized vs original

| Source | When to use |
|--------|-------------|
| **Normalized WAV** (default) | Most uploads; consistent 16 kHz mono input for pyannote |
| **Original upload** (`DIARIZATION_USE_ORIGINAL_AUDIO=true`) | Stereo recordings, poor speaker separation after mono downmix, or when normalized audio loses spatial cues |

After changing audio source or tuning values, re-transcribe — existing transcripts are not reprocessed.

### Segment quality

- **Too many tiny segments** → increase `DIARIZATION_MIN_SEGMENT_SECONDS` or `DIARIZATION_MERGE_GAP_SECONDS`
- **Same speaker split across turns** → increase `DIARIZATION_MERGE_GAP_SECONDS`
- **Very long meetings timing out** → set `DIARIZATION_MAX_SEGMENTS` (e.g. `50`) to cap ASR calls
- **Wrong speaker count** → try original audio; pyannote quality depends on recording conditions

Use the validation probe to inspect segment boundaries before running a full transcription:

```bash
uv run python scripts/validate_diarization.py --audio path/to/file.wav
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `403` / `gated repo` | Accept model terms on Hugging Face; token must be same account |
| No speaker labels | Run `validate_diarization.py`; check startup and worker logs |
| `pyannote-audio is required` | `cd backend && uv add pyannote-audio` |
| Poor speaker separation | Try `DIARIZATION_USE_ORIGINAL_AUDIO=true` |
| Too many segments / slow | Increase merge gap or set `DIARIZATION_MAX_SEGMENTS` |

See also [quickstart.md](quickstart.md) troubleshooting table.
