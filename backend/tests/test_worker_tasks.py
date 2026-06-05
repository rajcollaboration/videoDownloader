import pytest

from app.workers import tasks


def test_ensure_ffmpeg_available_passes_when_binary_exists(monkeypatch):
    monkeypatch.setattr(tasks, "which", lambda _: "ffmpeg")
    tasks._ensure_ffmpeg_available()


def test_ensure_ffmpeg_available_raises_when_missing(monkeypatch):
    monkeypatch.setattr(tasks, "which", lambda _: None)
    with pytest.raises(RuntimeError, match="ffmpeg is required"):
        tasks._ensure_ffmpeg_available()
