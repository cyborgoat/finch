import secrets


def _generate_id() -> str:
    return secrets.token_hex(8)


def generate_audio_id() -> str:
    return f"audio_{_generate_id()}"


def generate_transcript_id() -> str:
    return _generate_id()


def generate_job_id() -> str:
    return f"job_{_generate_id()}"


def generate_document_id() -> str:
    return _generate_id()


def generate_speaker_profile_id() -> str:
    return f"speaker_{_generate_id()}"


def generate_speaker_embedding_id() -> str:
    return f"semb_{_generate_id()}"
