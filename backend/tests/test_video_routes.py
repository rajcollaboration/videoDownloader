from app.routes import videos
from app.services.video_resolver import VideoResolverService


def test_resolve_video_success(client, monkeypatch):
    monkeypatch.setattr(videos, "get_json", lambda key: None)
    monkeypatch.setattr(videos, "set_json", lambda key, payload: None)
    monkeypatch.setattr(
        videos.resolver,
        "resolve",
        lambda url: {
            "platform": "YouTube",
            "title": "Integration Test Video",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration": "3:21",
            "formats": [
                {
                    "id": "18",
                    "label": "360p mp4",
                    "mimeType": "mp4",
                    "quality": "360p",
                    "filesizeMb": 12.3,
                    "audioOnly": False,
                }
            ],
            "playlist_entries": [],
            "is_playlist": False,
            "items_count": None,
        },
    )

    response = client.post("/v1/videos/resolve", json={"url": "https://youtube.com/watch?v=test"})

    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "YouTube"
    assert data["title"] == "Integration Test Video"
    assert data["formats"][0]["quality"] == "360p"
    assert data["legalNotice"]


def test_resolve_video_private_content_error(client, monkeypatch):
    monkeypatch.setattr(videos, "get_json", lambda key: None)
    monkeypatch.setattr(videos, "set_json", lambda key, payload: None)

    def raise_private(url: str):
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Private or restricted content is not supported.")

    monkeypatch.setattr(videos.resolver, "resolve", raise_private)

    response = client.post("/v1/videos/resolve", json={"url": "https://instagram.com/p/private"})
    assert response.status_code == 403
    assert "restricted" in response.json()["detail"]


def test_metrics_endpoint_exposed(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "clipfetch_http_requests_total" in response.text


def test_format_duration_accepts_float_metadata():
    service = VideoResolverService()

    assert service._format_duration(67.9) == "1:07"


def test_rate_limit_by_x_forwarded_for(client, monkeypatch):
    # Mock video resolver to avoid actual calls
    monkeypatch.setattr(videos, "get_json", lambda key: None)
    monkeypatch.setattr(videos, "set_json", lambda key, payload: None)
    monkeypatch.setattr(
        videos.resolver,
        "resolve",
        lambda url: {
            "platform": "YouTube",
            "title": "Test Video",
            "thumbnail_url": "",
            "duration": "1:00",
            "formats": [],
            "playlist_entries": [],
            "is_playlist": False,
            "items_count": None,
        },
    )

    # Set a low rate limit for this test
    from app.core.config import settings
    original_limit = settings.rate_limit_per_minute
    settings.rate_limit_per_minute = 2

    # Clear rate limit memory dict
    from app.core.security import _requests
    _requests.clear()

    try:
        # IP 1 makes 2 requests (limit is 2)
        resp1 = client.post(
            "/v1/videos/resolve",
            json={"url": "https://youtube.com/watch?v=1"},
            headers={"X-Forwarded-For": "1.1.1.1"}
        )
        assert resp1.status_code == 200

        resp2 = client.post(
            "/v1/videos/resolve",
            json={"url": "https://youtube.com/watch?v=2"},
            headers={"X-Forwarded-For": "1.1.1.1"}
        )
        assert resp2.status_code == 200

        # IP 1 makes 3rd request -> should be rate limited
        resp3 = client.post(
            "/v1/videos/resolve",
            json={"url": "https://youtube.com/watch?v=3"},
            headers={"X-Forwarded-For": "1.1.1.1"}
        )
        assert resp3.status_code == 429

        # IP 2 makes request -> should succeed (different IP)
        resp4 = client.post(
            "/v1/videos/resolve",
            json={"url": "https://youtube.com/watch?v=4"},
            headers={"X-Forwarded-For": "2.2.2.2"}
        )
        assert resp4.status_code == 200
    finally:
        # Restore original limit
        settings.rate_limit_per_minute = original_limit
        _requests.clear()

