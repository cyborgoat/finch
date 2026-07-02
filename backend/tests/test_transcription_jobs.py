import re
from datetime import UTC, datetime
from unittest.mock import patch

from app.domains.jobs.transcription_jobs import (
    default_recording_title,
    upload_recording_title,
)

RECORDING_TITLE_PATTERN = re.compile(
    r"^Recording \d{4}-\d{2}-\d{2} \d{2}:\d{2}( \(\d+\))?$"
)


def test_default_recording_title_uses_datetime_format():
    title = default_recording_title(set())
    assert RECORDING_TITLE_PATTERN.match(title)


@patch("app.domains.jobs.transcription_jobs.datetime")
def test_default_recording_title_avoids_collisions(mock_datetime):
    fixed_now = datetime(2026, 7, 2, 14, 30, tzinfo=UTC)
    mock_datetime.now.return_value = fixed_now

    base_title = "Recording 2026-07-02 14:30"
    assert default_recording_title(set()) == base_title
    assert default_recording_title({base_title}) == f"{base_title} (2)"
    assert default_recording_title({base_title, f"{base_title} (2)"}) == f"{base_title} (3)"


def test_upload_recording_title_uses_original_filename():
    assert upload_recording_title("meeting.wav", set()) == "meeting"
    assert upload_recording_title("notes.mp3", set()) == "notes"


def test_upload_recording_title_avoids_collisions():
    assert upload_recording_title("meeting.wav", {"meeting"}) == "meeting (2)"
    assert upload_recording_title("meeting.wav", {"meeting", "meeting (2)"}) == "meeting (3)"
