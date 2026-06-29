#!/usr/bin/env python3
"""Upload an audio file and run transcription through the Finch API."""

import sys
import time
from pathlib import Path

import httpx

API_BASE = "http://localhost:8000"
POLL_INTERVAL = 2.0


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: transcribe_file.py <audio-path>")
        return 1

    audio_path = Path(sys.argv[1]).resolve()
    if not audio_path.exists():
        print(f"File not found: {audio_path}")
        return 1

    with httpx.Client(timeout=600.0) as client:
        print(f"Uploading {audio_path.name} ({audio_path.stat().st_size / 1024 / 1024:.1f} MB)...")
        with audio_path.open("rb") as audio_file:
            upload = client.post(
                f"{API_BASE}/api/audio/upload",
                data={"source": "upload"},
                files={"file": (audio_path.name, audio_file, "audio/mpeg")},
            )
        upload.raise_for_status()
        audio = upload.json()
        print(f"Uploaded: {audio['id']} (duration: {audio.get('durationSeconds', '?')}s)")

        print("Starting transcription job...")
        job_resp = client.post(
            f"{API_BASE}/api/transcripts",
            json={"audioAssetId": audio["id"], "language": "auto"},
        )
        job_resp.raise_for_status()
        job_id = job_resp.json()["jobId"]
        print(f"Job: {job_id}")

        while True:
            job = client.get(f"{API_BASE}/api/jobs/{job_id}").json()
            status = job["status"]
            stage = job.get("stage")
            progress = job.get("progress", 0)
            print(f"  [{status}] {stage} ({progress:.0%})", flush=True)

            if status == "completed":
                transcript_id = job["resultId"]
                break
            if status == "failed":
                print(f"FAILED: {job.get('error')}")
                return 1

            time.sleep(POLL_INTERVAL)

        transcript = client.get(f"{API_BASE}/api/transcripts/{transcript_id}").json()
        print("\n--- Transcript ---\n")
        print(transcript["rawText"])

        out_path = audio_path.with_suffix(".txt")
        out_path.write_text(transcript["rawText"], encoding="utf-8")
        print(f"\nSaved to: {out_path}")
        print(f"Transcript ID: {transcript_id}")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
