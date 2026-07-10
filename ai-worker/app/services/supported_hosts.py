"""Host fragments for platforms yt-dlp can extract (excluding YouTube when disabled)."""

from urllib.parse import urlparse

# Substrings matched against parsed URL netloc (lowercase).
SUPPORTED_HOST_FRAGMENTS: tuple[str, ...] = (
    "facebook.com",
    "fb.watch",
    "fb.com",
    "instagram.com",
    "linkedin.com",
    "lnkd.in",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "vimeo.com",
    "reddit.com",
    "redd.it",
    "pinterest.com",
    "pin.it",
    "twitch.tv",
    "dailymotion.com",
    "threads.net",
    "snapchat.com",
    "tumblr.com",
    "bilibili.com",
    "soundcloud.com",
    "vk.com",
    "rumble.com",
)

YOUTUBE_HOST_FRAGMENTS: tuple[str, ...] = ("youtube.com", "youtu.be")


def normalize_host(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def host_matches(host: str, fragment: str) -> bool:
    return fragment in host


def is_youtube_host(host: str) -> bool:
    return any(host_matches(host, fragment) for fragment in YOUTUBE_HOST_FRAGMENTS)


def is_supported_host(host: str) -> bool:
    return any(host_matches(host, fragment) for fragment in SUPPORTED_HOST_FRAGMENTS)
