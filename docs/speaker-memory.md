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

Speaker memory is **optional**. Server defaults come from `.env` (`SPEAKER_MEMORY_ENABLED`); users turn **auto-label** on or off in **Settings → Speakers**. Voiceprints are stored locally only after consent.

## Prerequisites

1. **Diarization enabled** — `DIARIZATION_ENABLED=true` (see [diarization.md](diarization.md))
2. **Speaker memory available on server** — `SPEAKER_MEMORY_ENABLED=true` in `.env`
3. **Auto-label enabled in UI** — **Settings → Speakers → Auto-label speaker names** (consent required on first enable)
4. **HF token** — same as diarization (`HF_TOKEN`)

## Setup

In repo root `.env` or `backend/.env`:

```env
DIARIZATION_ENABLED=true
SPEAKER_MEMORY_ENABLED=true
HF_TOKEN=hf_...
```

Accept Hugging Face terms for:
- [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1)
- [pyannote/embedding](https://huggingface.co/pyannote/embedding)

Install dependencies:

```bash
cd backend && uv add pyannote-audio
```

## User flow (UI)

### Settings → Speakers

1. **Auto-label speaker names** — toggle on; accept consent the first time to store voiceprints locally
2. **Speaker list** — rename or delete saved profiles; link one as **You** under **Settings → You**

### Assigning speakers on a transcript

1. Transcribe audio with diarization
2. Transcript shows `Speaker 1`, `Speaker 2`, or `Unknown Speaker` per turn
3. **Click a speaker name** on a turn to assign or update their label
4. Choose an existing profile or enter a new name — saves immediately for all turns in that cluster
5. When auto-label is on and consent was given, the voiceprint is updated from **that turn’s audio**

### Future transcripts

1. Keep **auto-label** enabled in **Settings → Speakers**
2. Transcribe new audio
3. Matching runs automatically — known voices appear as saved names
4. Unrecognized voices show as `Unknown Speaker` — click the pill to assign

## Settings UI

| Section | Purpose |
|---------|---------|
| **You** | Your display name; map one saved speaker profile as yourself |
| **Language** | App / AI content language (English or 中文) |
| **AI notes** | Summary style and format for meeting summary notes |
| **Speakers** | Auto-label toggle; list of saved speakers (rename / delete) |

ASR and diarization configuration are **backend-only** (`.env` and startup logs). LLM provider settings can be configured in **Settings → LLM provider** or via `.env`.

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
| GET | `/api/speaker-profiles/{id}` | Profile detail |
| POST | `/api/speaker-profiles` | Create profile manually |
| PATCH | `/api/speaker-profiles/{id}` | Rename / edit notes |
| DELETE | `/api/speaker-profiles/{id}` | Delete profile + embeddings (clears **You** link if matched) |
| GET | `/api/speaker-memory/status` | Enabled, consent, profile count |
| POST | `/api/speaker-memory/consent` | Record consent |
| PATCH | `/api/speaker-memory/status` | Toggle auto-label (enabled) |
| DELETE | `/api/speaker-memory/data` | Wipe all voiceprint data |
| GET/PATCH | `/api/user-settings` | User name, language, summarization prefs, linked speaker profile |
| PATCH | `/api/transcripts/{id}/speakers` | Rename/link speakers; `enroll: true` saves voiceprint from optional turn timestamps |

Primary enrollment path: `PATCH /api/transcripts/{id}/speakers` with:

```json
{
  "mappings": [{
    "clusterId": "SPEAKER_00",
    "displayName": "Robert",
    "profileId": "speaker_…",
    "enroll": true,
    "enrollStartSec": 12.4,
    "enrollEndSec": 18.9
  }]
}
```

When `enrollStartSec` / `enrollEndSec` are omitted, enrollment uses the longest cluster segment.

## Privacy

- Voiceprints stored **locally** in SQLite (`SpeakerProfile`, `SpeakerEmbedding` tables)
- User preferences stored locally in SQLite (`AppPreference`, key `user_settings`)
- No audio or embeddings sent to external services
- Consent required before first enrollment via auto-label toggle
- Delete individual profiles from **Settings → Speakers**
- Auto-match only uses profiles you already enrolled

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Save does nothing | Speaker names save immediately when you click a turn’s speaker label; transcript text is read-only on Source |
| Still shows `Speaker 1` | Enable **auto-label** in Settings → Speakers; ensure consent given |
| All speakers `Unknown Speaker` | Assign speakers via pills on a transcript; lower `SPEAKER_MATCH_THRESHOLD` slightly |
| Wrong name matched | Raise threshold; re-assign via a cleaner turn’s speaker label |
| Consent required error | Turn on auto-label in Settings and accept consent before voiceprints can be stored |
| Auto-label toggle disabled | Enable diarization and speaker memory in `.env`; check startup logs and `HF_TOKEN` |

See also [diarization.md](diarization.md).
