from enum import StrEnum


class RecordingStatus(StrEnum):
    DRAFT = "draft"
    TRANSCRIBING = "transcribing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class NoteStatus(StrEnum):
    READY = "ready"
    GENERATING = "generating"
    FAILED = "failed"
