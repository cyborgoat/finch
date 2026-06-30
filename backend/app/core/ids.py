import secrets


def _generate_id(prefix: str) -> str:
    return f"{prefix}{secrets.token_hex(8)}"


def generate_audio_id() -> str:
    return _generate_id("audio_")


def generate_transcript_id() -> str:
    return _generate_id("transcript_")


def generate_job_id() -> str:
    return _generate_id("job_")


def generate_document_id() -> str:
    return _generate_id("doc_")


def generate_speaker_profile_id() -> str:
    return _generate_id("speaker_")


def generate_speaker_embedding_id() -> str:
    return _generate_id("semb_")
