from app.models.download import DownloadJob
from app.models.video import VideoRequest


def test_analytics_overview(client, db_session):
    request = VideoRequest(
        url="https://facebook.com/video/1",
        platform="Facebook",
        title="FB Video",
        thumbnail_url="https://example.com/fb.jpg",
        duration="1:30",
        formats=[{"id": "hd", "label": "HD", "mime_type": "mp4", "quality": "720p"}],
        playlist_entries=[],
        is_playlist=False,
        items_count=None,
    )
    db_session.add(request)
    db_session.commit()
    db_session.refresh(request)

    db_session.add(
        DownloadJob(
            request_id=request.id,
            format_id="hd",
            status="completed",
            progress=100,
            message="Done",
            audio_only=False,
        )
    )
    db_session.commit()

    response = client.get("/v1/analytics/overview")
    assert response.status_code == 200
    payload = response.json()
    assert payload["metrics"][0]["label"] == "Downloads processed"
    assert payload["recentJobs"][0]["platform"] == "Facebook"
