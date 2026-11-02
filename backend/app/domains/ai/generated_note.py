"""Parse LLM note completions into a display title + markdown body."""

from __future__ import annotations

import re

_TITLE_LINE_RE = re.compile(r"^\s*TITLE\s*:\s*(.+?)\s*$", re.IGNORECASE)
_SUBJECT_HEADING_RE = re.compile(r"^\s*#\s*Subject\s*:\s*(.+?)\s*$", re.IGNORECASE)
_GENERIC_HEADINGS = {
    "summary",
    "action items",
    "key decisions",
    "decisions",
    "tasks",
    "overview",
    "key points",
    "details",
    "open questions",
    "email body",
}


def parse_generated_note(completion: str) -> tuple[str | None, str]:
    """Split an LLM completion into (title, markdown).

    Prefers an explicit ``TITLE:`` line, then ``# Subject:`` for emails,
    then the first non-generic H1. Returns ``(None, markdown)`` when no
    content-derived title is found.
    """
    text = (completion or "").strip()
    if not text:
        return None, ""

    lines = text.splitlines()
    title: str | None = None
    body_start = 0

    for index, line in enumerate(lines):
        if not line.strip():
            if title is None and index == body_start:
                body_start = index + 1
            continue
        match = _TITLE_LINE_RE.match(line)
        if match and title is None:
            title = _clean_title(match.group(1))
            body_start = index + 1
            continue
        break

    markdown = "\n".join(lines[body_start:]).strip()

    if not title:
        title = _title_from_subject_heading(markdown)
    if not title:
        title = _title_from_first_content_heading(markdown)

    return title, markdown


def _clean_title(raw: str) -> str | None:
    cleaned = " ".join(raw.strip().strip("\"'").split())
    if not cleaned:
        return None
    if cleaned.casefold() in _GENERIC_HEADINGS:
        return None
    return cleaned[:120]


def _title_from_subject_heading(markdown: str) -> str | None:
    for line in markdown.splitlines():
        if not line.strip():
            continue
        match = _SUBJECT_HEADING_RE.match(line)
        if match:
            return _clean_title(match.group(1))
        break
    return None


def _title_from_first_content_heading(markdown: str) -> str | None:
    for line in markdown.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("# "):
            return _clean_title(stripped[2:])
        break
    return None
