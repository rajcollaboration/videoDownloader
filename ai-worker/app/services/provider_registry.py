from urllib.parse import urlparse

from fastapi import HTTPException, status

from app.core.config import settings
from app.services.supported_hosts import (
    is_supported_host,
    is_youtube_host,
    normalize_host,
)


def _platform_from_host(host: str) -> str:
    rules: list[tuple[str, tuple[str, ...]]] = [
        ("facebook", ("facebook.com", "fb.watch", "fb.com")),
        ("instagram", ("instagram.com",)),
        ("linkedin", ("linkedin.com", "lnkd.in")),
        ("tiktok", ("tiktok.com",)),
        ("twitter", ("twitter.com", "x.com")),
        ("vimeo", ("vimeo.com",)),
        ("reddit", ("reddit.com", "redd.it")),
        ("pinterest", ("pinterest.com", "pin.it")),
        ("twitch", ("twitch.tv",)),
        ("dailymotion", ("dailymotion.com",)),
        ("threads", ("threads.net",)),
        ("snapchat", ("snapchat.com",)),
        ("tumblr", ("tumblr.com",)),
        ("bilibili", ("bilibili.com",)),
        ("soundcloud", ("soundcloud.com",)),
        ("vk", ("vk.com",)),
        ("rumble", ("rumble.com",)),
    ]
    for platform, fragments in rules:
        if any(fragment in host for fragment in fragments):
            return platform
    return "generic"


def detect_platform(url: str) -> str:
    host = normalize_host(url)

    if is_youtube_host(host):
        if not settings.enable_youtube:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="YouTube processing is disabled by configuration pending legal review.",
            )
        return "youtube"

    if not is_supported_host(host):
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid URL.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported URL. Supported platforms include Instagram, Facebook, "
                "TikTok, LinkedIn, X (Twitter), Vimeo, Reddit, Pinterest, Twitch, and more. "
                "YouTube is not available."
            ),
        )

    return _platform_from_host(host)
