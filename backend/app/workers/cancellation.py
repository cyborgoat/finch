import signal
import threading

from app.core.errors import AppError


_shutdown_requested = False
_handlers_installed = False


class JobCancelledError(AppError):
    def __init__(self, message: str = "Transcription cancelled.") -> None:
        super().__init__("TRANSCRIPTION_CANCELLED", message, 499)


def _handle_shutdown(_signum: int, _frame) -> None:
    global _shutdown_requested
    _shutdown_requested = True


def install_shutdown_handlers() -> None:
    global _handlers_installed
    if _handlers_installed:
        return
    if threading.current_thread() is not threading.main_thread():
        return
    try:
        signal.signal(signal.SIGINT, _handle_shutdown)
        signal.signal(signal.SIGTERM, _handle_shutdown)
    except ValueError:
        # Huey immediate mode runs tasks on API worker threads during tests.
        return
    _handlers_installed = True


def reset_cancellation_state() -> None:
    global _shutdown_requested
    _shutdown_requested = False


def is_shutdown_requested() -> bool:
    return _shutdown_requested


def check_cancelled() -> None:
    if _shutdown_requested:
        raise JobCancelledError("Transcription cancelled during worker shutdown.")
