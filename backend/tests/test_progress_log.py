from app.core.progress_log import ProgressLogger, progress_log


def test_progress_logger_logs_milestones(monkeypatch):
    monkeypatch.setattr("app.core.progress_log.sys.stderr.isatty", lambda: False)
    messages: list[str] = []

    def _capture_info(message, *args):
        messages.append(message % args if args else str(message))

    monkeypatch.setattr("app.core.progress_log.logger.info", _capture_info)

    with progress_log("ASR chunks", 20, unit="chunk") as progress:
        for _ in range(20):
            progress.step()

    assert messages
    assert messages[0] == "ASR chunks: 5/20 (25%)"
    assert messages[-1] == "ASR chunks: 20/20 (100%)"


def test_progress_logger_noop_when_total_zero(monkeypatch):
    monkeypatch.setattr("app.core.progress_log.sys.stderr.isatty", lambda: False)
    messages: list[str] = []

    def _capture_info(message, *args):
        messages.append(message % args if args else str(message))

    monkeypatch.setattr("app.core.progress_log.logger.info", _capture_info)

    with progress_log("ASR chunks", 0, unit="chunk") as progress:
        progress.step()

    assert not messages


def test_progress_logger_uses_tqdm_on_tty(monkeypatch):
    monkeypatch.setattr("app.core.progress_log.sys.stderr.isatty", lambda: True)
    updates: list[int] = []

    class FakeBar:
        def update(self, n: int) -> None:
            updates.append(n)

        def close(self) -> None:
            pass

    monkeypatch.setattr(
        "tqdm.tqdm",
        lambda **_kwargs: FakeBar(),
    )

    with ProgressLogger("ASR segments", 3, unit="seg") as progress:
        for _ in range(3):
            progress.step()

    assert updates == [1, 1, 1]
