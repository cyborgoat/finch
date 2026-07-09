import logging
import sys

logger = logging.getLogger(__name__)


def _milestone_step(total: int) -> int:
    if total <= 10:
        return 1
    if total <= 50:
        return 5
    return max(1, total // 20)


class ProgressLogger:
    def __init__(self, description: str, total: int, *, unit: str = "item") -> None:
        self.description = description
        self.total = max(total, 0)
        self.unit = unit
        self.current = 0
        self._last_logged = 0
        self._bar = None
        self._use_tqdm = sys.stderr.isatty() and self.total > 0

    def __enter__(self) -> "ProgressLogger":
        if self._use_tqdm:
            from tqdm import tqdm

            self._bar = tqdm(
                total=self.total,
                desc=self.description,
                unit=self.unit,
                file=sys.stderr,
                leave=True,
            )
        return self

    def __exit__(self, *_args) -> None:
        if self._bar is not None:
            self._bar.close()

    def step(self) -> None:
        if self.total <= 0:
            return
        self.current += 1
        if self._bar is not None:
            self._bar.update(1)
            return
        step = _milestone_step(self.total)
        if self.current == self.total or self.current - self._last_logged >= step:
            pct = int((self.current / self.total) * 100)
            logger.info(
                "%s: %d/%d (%d%%)",
                self.description,
                self.current,
                self.total,
                pct,
            )
            self._last_logged = self.current


def progress_log(description: str, total: int, *, unit: str = "item") -> ProgressLogger:
    return ProgressLogger(description, total, unit=unit)
