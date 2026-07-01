# Voiceprint Profiles

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

Voiceprint profiles are **optional**. Enable diarization and voiceprint storage in **Settings → Transcription** (stored locally in SQLite). Users turn **auto-label** on or off in **Settings → Voiceprint profiles**. Voiceprints are stored locally only after consent.

## Prerequisites

1. **Diarization enabled** — **Settings → Transcription** (or `DIARIZATION_ENABLED=true` in `.env` as fallback; see [diarization.md](diarization.md))
2. **Voiceprint profiles enabled** — **Settings → Transcription** (or `SPEAKER_MEMORY_ENABLED=true` in `.env` as fallback)
3. **Auto-label enabled in UI** — **Settings → Voiceprint profiles → Auto-label speaker names** (consent required on first enable)
4. **HF token** — **Settings → Transcription** or `HF_TOKEN` in `.env`

## Setup

Preferred: enable in the frontend under **Settings → Transcription** and paste your Hugging Face token there.

Optional `.env` fallbacks (used when nothing is stored in SQLite yet):

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
cd backend && uv add pyannote-audio omegaconf speechbrain
```

`omegaconf` and `speechbrain` are required to load the `pyannote/embedding` checkpoint (not always pulled in transitively).

## User flow (UI)

### Settings → Voiceprint profiles

1. **Auto-label speaker names** — toggle on; accept consent the first time to store voiceprints locally
2. **Profile list** — rename or delete saved profiles; link one as **You** under **Settings → You**

### Assigning speakers on a transcript

1. Transcribe audio with diarization
2. Recording shows `Speaker 1`, `Speaker 2`, or `Unknown Speaker` per turn
3. **Click a speaker name** on a turn to assign or update their label
4. Choose an existing profile or enter a new name — saves immediately for all turns in that cluster
5. When auto-label is on and consent was given, the voiceprint is updated from **that turn’s audio**

### Future transcripts

1. Keep **auto-label** enabled in **Settings → Voiceprint profiles**
2. Transcribe new audio
3. Matching runs automatically — known voices appear as saved names
4. Unrecognized voices show as `Unknown Speaker` — click the pill to assign

## Settings UI

| Section | Purpose |
|---------|---------|
| **You** | Your display name; map one saved voiceprint profile as yourself |
| **Language & region** | Interface language and AI note content language (English or 中文) |
| **AI notes** | Summary style and format for meeting summary notes |
| **Transcription** | Diarization, voiceprint profiles, Hugging Face token |
| **Voiceprint profiles** | Auto-label toggle; list of saved profiles (rename / delete) |
| **LLM provider** | Configurable LLM credentials (stored locally in SQLite) |

Advanced diarization tuning (`DIARIZATION_MIN_SEGMENT_SECONDS`, etc.) remains in `.env`. See [diarization.md](diarization.md).

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
| GET/PATCH | `/api/transcription-settings` | Diarization, voiceprint profiles, HF token |
| GET | `/api/speaker-profiles` | List profiles |
| GET | `/api/speaker-profiles/{id}` | Profile detail |
| POST | `/api/speaker-profiles` | Create profile manually |
| PATCH | `/api/speaker-profiles/{id}` | Rename / edit notes |
| DELETE | `/api/speaker-profiles/{id}` | Delete profile + embeddings (clears **You** link if matched) |
| GET | `/api/speaker-memory/status` | Enabled, consent, profile count |
| POST | `/api/speaker-memory/consent` | Record consent |
| PATCH | `/api/speaker-memory/status` | Toggle auto-label (enabled) |
| DELETE | `/api/speaker-memory/data` | Wipe all voiceprint data |
| GET/PATCH | `/api/user-settings` | User name, ui/content language, summarization prefs, linked voiceprint profile |
| PATCH | `/api/recordings/{id}/speakers` | Rename/link speakers; `enroll: true` saves voiceprint from optional turn timestamps |

Primary enrollment path: `PATCH /api/recordings/{id}/speakers` with:

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
- Transcription and user preferences stored locally in SQLite (`AppPreference`)
- No audio or embeddings sent to external services
- Consent required before first enrollment via auto-label toggle
- Delete individual profiles from **Settings → Voiceprint profiles**
- Auto-match only uses profiles you already enrolled

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Save does nothing | Speaker names save immediately when you click a turn’s speaker label; transcript text is read-only on Source |
| Still shows `Speaker 1` | Enable **auto-label** in Settings → Voiceprint profiles; ensure consent given |
| All speakers `Unknown Speaker` | Assign speakers via pills on a transcript; lower `SPEAKER_MATCH_THRESHOLD` slightly |
| Wrong name matched | Raise threshold; re-assign via a cleaner turn’s speaker label |
| Consent required error | Turn on auto-label in Settings and accept consent before voiceprints can be stored |
| Auto-label toggle disabled | Enable diarization and voiceprint profiles in **Settings → Transcription**; check startup logs and HF token |
| `No module named 'omegaconf'` | Run `cd backend && uv add omegaconf speechbrain` and restart the backend |

See also [diarization.md](diarization.md).
