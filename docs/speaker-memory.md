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

### First transcript

1. Transcribe audio with diarization
2. Transcript shows `Speaker 1`, `Speaker 2`, or `Unknown Speaker`
3. Open transcript → **Speaker names** panel
4. Match to a saved profile from the dropdown **or** type a new name
5. Optionally check **Remember this voice from this recording**
6. Click the main **Save** button (toolbar)
7. Accept consent dialog if enrolling a voiceprint for the first time

### Future transcripts

1. Enable speaker memory in Settings (with consent)
2. Transcribe new audio
3. Matching runs automatically — known voices appear as saved names
4. Unrecognized voices show as `Unknown Speaker` — assign from the profile dropdown

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
| Save does nothing | Use the main **Save** button in the toolbar (persists speakers + text together) |
| Still shows `Speaker 1` | Enable speaker memory in Settings; ensure consent given |
| All speakers `Unknown Speaker` | Enroll voices from a transcript; lower `SPEAKER_MATCH_THRESHOLD` slightly |
| Wrong name matched | Raise threshold; re-enroll with cleaner speech segment |
| Consent required error | Accept consent in dialog or Settings before enrolling |
| Not ready in health | Enable diarization first; check `HF_TOKEN` and pyannote install |

See also [diarization.md](diarization.md).
