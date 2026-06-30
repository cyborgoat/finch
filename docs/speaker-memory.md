# Speaker Memory

Remember speaker **names** across transcripts using local voice embeddings. pyannote separates speakers; Finch stores voiceprints and maps them to names you choose.

Output example:

```txt
Robert: Let's summarize this meeting.
David: Sure. The main topic is the new ASR pipeline.
Robert: Great, let's review the action items next.
```

## How it works

```txt
Audio → diarization (SPEAKER_00, SPEAKER_01)
      → embedding per cluster (pyannote/embedding)
      → match vs saved profiles (cosine similarity)
      → display names (Robert, David, or Unknown Speaker)
      → per-segment ASR
```

Speaker memory is **optional** and **off by default**. Voiceprints are stored locally only after you consent.

## Prerequisites

1. **Diarization enabled** — `DIARIZATION_ENABLED=true` (see [diarization.md](diarization.md))
2. **Speaker memory enabled** — in `.env` or **Settings → Speaker memory**
3. **Consent** — required before saving any voiceprint
4. **HF token** — same as diarization (`HF_TOKEN`)

## Setup

In repo root `.env` or `backend/.env`:

```env
DIARIZATION_ENABLED=true
DIARIZATION_MOCK=false
SPEAKER_MEMORY_ENABLED=true
SPEAKER_MEMORY_MOCK=false
HF_TOKEN=hf_...
```

Accept Hugging Face terms for:
- [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1)
- [pyannote/embedding](https://huggingface.co/pyannote/embedding)

Install dependencies:

```bash
cd backend && uv add pyannote-audio
```

For development without real embeddings:

```env
SPEAKER_MEMORY_MOCK=true
```

## User flow (UI)

### Settings (required for voiceprints)

1. **Settings → Speaker memory** — enable speaker memory and accept consent
2. Manage saved voice profiles from the same page

### Assigning speakers on a transcript

1. Transcribe audio with diarization
2. Transcript shows `Speaker 1`, `Speaker 2`, or `Unknown Speaker` per turn
3. **Click any speaker pill** on a turn to assign or update their name
4. Choose an existing profile or enter a new name — saves immediately for all turns in that cluster
5. If speaker memory is enabled **and** consent was given in Settings, the voiceprint is updated from **that turn’s audio**

### Future transcripts

1. Keep speaker memory enabled in Settings
2. Transcribe new audio
3. Matching runs automatically — known voices appear as saved names
4. Unrecognized voices show as `Unknown Speaker` — click the pill to assign

## Settings UI

**Settings → Speaker memory**

- Enable / disable speaker memory
- Consent status
- Voice profile list with embedding description, voiceprint samples, and related transcripts
- Delete individual profiles or **Delete all voiceprints**

## Tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `SPEAKER_MATCH_THRESHOLD` | `0.75` | Min cosine similarity to auto-match a profile |
| `SPEAKER_MIN_ENROLL_SECONDS` | `2.0` | Min speech duration used for enrollment embedding |
| `SPEAKER_EMBEDDING_MODEL_ID` | `pyannote/embedding` | Embedding model |

Lower threshold → more aggressive matching (more false positives).  
Higher threshold → stricter matching (more `Unknown Speaker`).

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/speaker-profiles` | List profiles |
| GET | `/api/speaker-profiles/{id}` | Profile detail (embeddings, related transcripts) |
| POST | `/api/speaker-profiles` | Create profile manually |
| PATCH | `/api/speaker-profiles/{id}` | Rename / edit notes |
| DELETE | `/api/speaker-profiles/{id}` | Delete profile + embeddings |
| GET | `/api/speaker-memory/status` | Enabled, consent, profile count |
| POST | `/api/speaker-memory/consent` | Record consent |
| PATCH | `/api/speaker-memory/status` | Toggle enabled |
| DELETE | `/api/speaker-memory/data` | Wipe all voiceprint data |
| PATCH | `/api/transcripts/{id}/speakers` | Rename/link speakers; set `enroll: true` to save voiceprint |

Primary enrollment path: `PATCH /api/transcripts/{id}/speakers` with `{ mappings: [{ clusterId, displayName, profileId?, enroll? }] }`.

## Privacy

- Voiceprints stored **locally** in SQLite (`SpeakerProfile`, `SpeakerEmbedding` tables)
- No audio or embeddings sent to external services
- Consent required before first enrollment
- Delete individual profiles or all data from Settings
- Auto-match only uses profiles you already enrolled

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Save does nothing | Speaker pills save immediately; use **Save** in the toolbar for title and full text only |
| Still shows `Speaker 1` | Enable speaker memory in Settings; ensure consent given |
| All speakers `Unknown Speaker` | Assign speakers via pills on a transcript; lower `SPEAKER_MATCH_THRESHOLD` slightly |
| Wrong name matched | Raise threshold; re-assign via a cleaner turn’s speaker pill |
| Consent required error | Accept consent in **Settings → Speaker memory** before voiceprints can be stored |
| Not ready in health | Enable diarization first; check `HF_TOKEN` and pyannote install |

See also [diarization.md](diarization.md).
