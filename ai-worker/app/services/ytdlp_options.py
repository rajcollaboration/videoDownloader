from pathlib import Path

from app.core.config import settings


def cookie_options() -> dict:
    """Return yt-dlp options for cookie-based auth, if configured.

    Instagram/Facebook/TikTok frequently respond to anonymous requests with
    "rate-limit reached or login required" / "private" errors even for
    public content. Pointing yt-dlp at a cookies.txt from a logged-in
    session (via YTDLP_COOKIES_FILE) avoids most of these.
    """
    cookies_file = settings.ytdlp_cookies_file
    if cookies_file and Path(cookies_file).is_file():
        return {"cookiefile": cookies_file}
    return {}
