from collections.abc import Iterable
from urllib.parse import urlparse

from fastapi import HTTPException, status
from yt_dlp import YoutubeDL

from app.core.config import settings
from app.services.provider_registry import detect_platform
from app.services.ytdlp_options import cookie_options


class VideoResolverService:
    def __init__(self) -> None:
        # `extract_flat="in_playlist"` tells yt-dlp to list playlist entries
        # by id/title/url only — without a separate network round-trip per
        # entry to resolve formats. That single-video resolution happens
        # later, at download time. Without this, resolving a 50-item
        # playlist can take minutes and trip the nginx 60s proxy timeout.
        #
        # YouTube's SSAP experiment silently strips URLs from `web` client
        # formats (yt-dlp logs "signature extraction failed"). Asking for
        # android + ios + web_safari clients recovers a full format set.
        self._ydl_options = {
            "quiet": True,
            "skip_download": True,
            "noplaylist": False,
            "extract_flat": "in_playlist",
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "ios", "web_safari", "web"],
                },
            },
            **cookie_options(),
        }

    def validate_url(self, url: str) -> None:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid URL. Please provide a valid public video link.",
            )

    def resolve(self, url: str) -> dict:
        self.validate_url(url)
        platform = detect_platform(url)

        try:
            with YoutubeDL(self._ydl_options) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception as exc:
            status_code, detail = self._friendly_error(exc)
            raise HTTPException(status_code=status_code, detail=detail) from exc

        entries = info.get("entries") or []
        is_playlist = bool(entries)
        raw_formats = info.get("formats", []) if not is_playlist else []

        # yt-dlp sometimes flags `availability` as "private"/"subscriber_only"
        # from page-level signals (e.g. a login wall shown to anonymous
        # visitors) even though it still managed to extract playable formats
        # or playlist entries. Only treat it as truly inaccessible when no
        # usable content came back — otherwise we'd reject videos that
        # actually download fine.
        has_content = bool(raw_formats) or bool(entries)
        if info.get("availability") in {"private", "subscriber_only"} and not has_content:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Private or restricted content is not supported.",
            )

        if is_playlist and len(entries) > settings.max_playlist_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Playlist exceeds the maximum size of {settings.max_playlist_size} items.",
            )

        formats = self._build_quality_options(raw_formats)

        return {
            "platform": platform.capitalize(),
            "title": info.get("title", "Untitled video"),
            "thumbnail_url": self._best_thumbnail(info),
            "duration": self._format_duration(info.get("duration")),
            "formats": formats,
            "playlist_entries": self._format_playlist_entries(entries),
            "is_playlist": is_playlist,
            "items_count": len(entries) if is_playlist else None,
        }

    def _friendly_error(self, exc: Exception) -> tuple[int, str]:
        """Translate a raw yt-dlp exception into a clearer status + message.

        yt-dlp surfaces Instagram/Facebook/TikTok anti-bot responses (rate
        limiting, anonymous-view login walls) with messages like "Requested
        content is not available, rate-limit reached or login required" —
        which reads as "this video is private" even when the same video
        downloads fine elsewhere (e.g. with a logged-in session). Map known
        patterns to honest, actionable messages instead of dumping the raw
        yt-dlp error.
        """
        message = str(exc).lower()

        if "rate-limit" in message or "rate limit" in message or "429" in message:
            return (
                status.HTTP_429_TOO_MANY_REQUESTS,
                "This platform is temporarily rate-limiting our server. "
                "Please wait a minute and try again.",
            )

        if "login required" in message or "log in" in message:
            return (
                status.HTTP_403_FORBIDDEN,
                "This content could not be verified as public — the platform "
                "is asking for a logged-in session. If you're sure this video "
                "is public, please try again shortly.",
            )

        if "private" in message or "subscriber_only" in message:
            return (
                status.HTTP_403_FORBIDDEN,
                "Private or restricted content is not supported.",
            )

        if "unavailable" in message or "not available" in message or "404" in message:
            return (
                status.HTTP_400_BAD_REQUEST,
                "This content is unavailable. It may have been deleted, made "
                "private, or restricted in your region.",
            )

        return (
            status.HTTP_400_BAD_REQUEST,
            "Could not access this content. The link may be invalid, or the "
            "platform is temporarily blocking automated requests — please try "
            "again shortly.",
        )

    def _best_thumbnail(self, info: dict) -> str:
        thumb = info.get("thumbnail")
        if thumb and str(thumb).startswith("http"):
            return str(thumb)
        thumbnails = info.get("thumbnails") or []
        for entry in reversed(thumbnails):
            url = entry.get("url") if isinstance(entry, dict) else None
            if url and str(url).startswith("http"):
                return str(url)
        return "https://placehold.co/1280x720/png"

    def _format_duration(self, duration_seconds: int | float | None) -> str:
        if not duration_seconds:
            return "Unknown duration"

        normalized_duration = max(0, int(duration_seconds))
        minutes, seconds = divmod(normalized_duration, 60)
        hours, minutes = divmod(minutes, 60)
        if hours:
            return f"{hours:d}:{minutes:02d}:{seconds:02d}"
        return f"{minutes:d}:{seconds:02d}"

    # Generic yt-dlp format selectors — work for single videos and playlists.
    # yt-dlp falls back gracefully if an exact height isn't available.
    _QUALITY_LADDER = (
        ("2160p (4K)", 2160),
        ("1440p (2K)", 1440),
        ("1080p (Full HD)", 1080),
        ("720p (HD)", 720),
        ("480p", 480),
        ("360p", 360),
    )

    def _build_quality_options(self, raw_formats: Iterable[dict]) -> list[dict]:
        """Produce a clean, uniform quality picker.

        For a single video, we probe available heights to only offer
        qualities that actually exist. For playlists (no raw formats), we
        return the full ladder — yt-dlp picks the best available per entry
        at download time.
        """
        available_heights: set[int] = set()
        max_filesize_by_height: dict[int, int] = {}
        for item in raw_formats:
            height = item.get("height")
            if not height or item.get("vcodec") == "none":
                continue
            available_heights.add(height)
            size = item.get("filesize") or item.get("filesize_approx") or 0
            if size:
                max_filesize_by_height[height] = max(
                    max_filesize_by_height.get(height, 0), size
                )

        max_h = max(available_heights) if available_heights else None

        options: list[dict] = []
        for label, max_height in self._QUALITY_LADDER:
            if max_h is not None:
                # Don't offer rungs above the video's real resolution.
                if max_height > max_h:
                    continue
                # Don't offer rungs so low that no matching format exists.
                if not any(h <= max_height for h in available_heights):
                    continue

            # Forgiving yt-dlp selector:
            # 1. Best video+audio at <= height (any codec — yt-dlp will mux to mp4)
            # 2. Best single combined format at <= height
            # 3. Any best (final fallback — never fails)
            # Keep under 100 chars for the DB column.
            selector = f"bv*[height<={max_height}]+ba/b[height<={max_height}]/b"
            nearest = None
            if max_filesize_by_height:
                candidates = [
                    (h, s) for h, s in max_filesize_by_height.items() if h <= max_height
                ]
                if candidates:
                    nearest = max(candidates, key=lambda x: x[0])[1]
            options.append(
                {
                    "id": selector,
                    "label": label,
                    "mime_type": "video/mp4",
                    "quality": label,
                    "filesize_mb": round(nearest / (1024 * 1024), 1) if nearest else None,
                    "audio_only": False,
                }
            )

        # Always include an Audio-only option.
        options.append(
            {
                "id": "bestaudio/best",
                "label": "Audio only (MP3)",
                "mime_type": "audio/mp3",
                "quality": "Audio",
                "filesize_mb": None,
                "audio_only": True,
            }
        )

        return options

    def _format_playlist_entries(self, entries: list[dict]) -> list[dict]:
        formatted: list[dict] = []
        for index, entry in enumerate(entries, start=1):
            source_url = self._normalize_playlist_entry_url(entry)
            if not source_url:
                continue

            formatted.append(
                {
                    "title": entry.get("title", f"Playlist item {index}"),
                    "source_url": source_url,
                    "duration": self._format_duration(entry.get("duration")),
                    "position": index,
                }
            )
        return formatted

    def _normalize_playlist_entry_url(self, entry: dict) -> str | None:
        source_url = entry.get("webpage_url") or entry.get("url")
        if not source_url:
            return None

        parsed = urlparse(source_url)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return source_url

        # With `extract_flat`, yt-dlp often returns YouTube playlist items as
        # bare IDs. The downloader worker expects a real URL.
        ie_key = (entry.get("ie_key") or "").lower()
        if ie_key.startswith("youtube"):
            return f"https://www.youtube.com/watch?v={source_url}"

        return source_url
