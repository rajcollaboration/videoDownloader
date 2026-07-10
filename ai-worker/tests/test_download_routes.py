from app.models.download import DownloadJob, PlaylistItem
from app.models.video import VideoRequest
from app.routes import downloads
from app.services import download_service


def test_create_download_job(client, db_session, monkeypatch):
    request = VideoRequest(
        url="https://youtube.com/watch?v=abc",
        platform="YouTube",
        title="Queued Video",
        thumbnail_url="https://example.com/thumb.jpg",
        duration="4:20",
        formats=[{"id": "22", "label": "720p", "mime_type": "mp4", "quality": "720p"}],
        playlist_entries=[],
        is_playlist=False,
        items_count=None,
    )
    db_session.add(request)
    db_session.commit()
    db_session.refresh(request)

    scheduled = []
    monkeypatch.setattr(
        download_service.process_download,
        "delay",
        lambda job_id: scheduled.append(job_id),
    )

    response = client.post(
        "/v1/downloads",
        json={"request_id": request.id, "format_id": "22", "audio_only": False},
    )

    assert response.status_code == 202
    payload = response.json()
    assert payload["status"] == "pending"
    assert scheduled == [payload["jobId"]]


def test_download_status_includes_playlist_items(client, db_session):
    request = VideoRequest(
        url="https://youtube.com/playlist?list=xyz",
        platform="YouTube",
        title="Playlist",
        thumbnail_url="https://example.com/playlist.jpg",
        duration="Unknown duration",
        formats=[{"id": "140", "label": "audio", "mime_type": "m4a", "quality": "audio"}],
        playlist_entries=[],
        is_playlist=True,
        items_count=2,
    )
    db_session.add(request)
    db_session.commit()
    db_session.refresh(request)

    job = DownloadJob(
        request_id=request.id,
        format_id="140",
        status="processing",
        progress=50,
        message="Processing playlist item 1 of 2",
        audio_only=True,
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)

    db_session.add_all(
        [
            PlaylistItem(
                job_id=job.id,
                source_url="https://youtube.com/watch?v=1",
                title="Item 1",
                duration="1:00",
                position=1,
                status="completed",
                progress=100,
                output_path="/tmp/item1.mp3",
            ),
            PlaylistItem(
                job_id=job.id,
                source_url="https://youtube.com/watch?v=2",
                title="Item 2",
                duration="2:00",
                position=2,
                status="processing",
                progress=30,
            ),
        ]
    )
    db_session.commit()

    response = client.get(f"/v1/downloads/{job.id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["playlistItems"][0]["title"] == "Item 1"
    assert len(payload["playlistItems"]) == 2
