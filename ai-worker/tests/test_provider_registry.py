import pytest
from fastapi import HTTPException

from app.services.provider_registry import detect_platform


def test_detects_tiktok():
    assert detect_platform("https://www.tiktok.com/@user/video/123") == "tiktok"


def test_detects_linkedin():
    assert detect_platform("https://www.linkedin.com/posts/foo") == "linkedin"


def test_detects_instagram():
    assert detect_platform("https://www.instagram.com/reel/abc/") == "instagram"


def test_youtube_disabled_when_flag_off(monkeypatch):
    from app.services import provider_registry

    monkeypatch.setattr(provider_registry.settings, "enable_youtube", False)

    with pytest.raises(HTTPException) as exc:
        detect_platform("https://www.youtube.com/watch?v=abc")
    assert exc.value.status_code == 403


def test_rejects_unknown_host():
    with pytest.raises(HTTPException) as exc:
        detect_platform("https://example.com/video")
    assert exc.value.status_code == 400
