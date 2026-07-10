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
