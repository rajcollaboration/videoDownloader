from app.services.video_resolver import VideoResolverService


def test_format_playlist_entries_normalizes_youtube_ids_to_urls():
    service = VideoResolverService()
    entries = [
        {"title": "One", "url": "dQw4w9WgXcQ", "ie_key": "Youtube"},
        {"title": "Two", "webpage_url": "https://www.youtube.com/watch?v=oHg5SJYRHA0"},
    ]

    formatted = service._format_playlist_entries(entries)

    assert formatted[0]["source_url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert formatted[1]["source_url"] == "https://www.youtube.com/watch?v=oHg5SJYRHA0"
