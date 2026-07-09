import logging
import sys

_NOISY_LOGGERS = (
    "transformers",
    "pyannote",
    "speechbrain",
    "httpx",
    "urllib3",
    "filelock",
    "huggingface_hub",
    "qwen_asr",
)

# transformers logs tokenizer/generation notices at WARNING (e.g. pad_token_id).
_NOISY_LOGGER_LEVELS: dict[str, int] = {
    "transformers": logging.ERROR,
}


def setup_logging(*, debug: bool = False) -> None:
    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
        force="pytest" not in sys.modules,
    )
    if not debug:
        for name in _NOISY_LOGGERS:
            level = _NOISY_LOGGER_LEVELS.get(name, logging.WARNING)
            logging.getLogger(name).setLevel(level)
