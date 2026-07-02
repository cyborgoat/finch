# Long audio (1–2 hours)

Finch accepts files up to **2 hours** and **500 MB**. Transcription runs in a background job with ASR chunking. Long files **complete** on capable hardware, but they are not instant.

## Prefer upload over in-browser recording

| Method | Best for |
|--------|----------|
| **Upload** (MP3, M4A, etc.) | Meetings, podcasts, 30+ minute sessions |
| **Browser recording** | Quick voice notes (under ~30 minutes) |

In-browser recording keeps the full audio in memory. Long sessions (1–2 hours) risk tab crashes or lost work. Upload a compressed file instead.

## Limits

| Limit | Value |
|-------|-------|
| Max duration | 7200 s (2 h) — enforced after ffmpeg normalization |
| Max upload size | 500 MB |
| ASR chunk size | 45 s windows for audio longer than 60 s |

Configure via `MAX_AUDIO_DURATION_SECONDS` and `MAX_UPLOAD_MB` in `.env` if needed.

## What to expect

- **Transcription time:** Often tens of minutes to well over an hour, depending on CPU/GPU and whether diarization is on.
- **Playback:** Streamed — 2 h playback is fine.
- **RAM:** 16 GB+ recommended for 2 h files with diarization. Machines under 8 GB may OOM during processing.
- **Worker:** Keep the Huey consumer running (`huey_consumer -w 1`). Jobs have no server-side timeout — slow jobs keep running until done or failed.

## Diarization on long meetings

Diarization runs a full-file pass, then ASR on each speaker segment. A 2 h meeting with many speakers can produce hundreds of segments and take a very long time.

Tune in `.env` (see [diarization.md](diarization.md)):

```env
DIARIZATION_MAX_SEGMENTS=50
DIARIZATION_MERGE_GAP_SECONDS=1.0
```

`DIARIZATION_MAX_SEGMENTS=0` means no cap (default) — fine for short files, risky for 2 h meetings.

## Quick checklist

1. Upload compressed audio (MP3/M4A) when possible.
2. Start the Huey worker before transcribing.
3. Use GPU/MPS if available (`ASR_DEVICE=auto` on Apple Silicon).
4. For long meetings with diarization, set `DIARIZATION_MAX_SEGMENTS`.
5. Leave the page while transcribing — poll progress from the recordings list.
