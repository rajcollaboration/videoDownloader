import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.cache import build_cache_key, get_json, set_json
from app.core.security import enforce_rate_limit
from app.db.session import get_db
from app.models.video import VideoRequest
from app.schemas.video import ResolveVideoRequest, ResolveVideoResponse, VideoFormatResponse
from app.services.video_resolver import VideoResolverService

router = APIRouter()
resolver = VideoResolverService()

_THUMBNAIL_TIMEOUT = 10  # seconds
_FALLBACK_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">'
    '<rect width="640" height="360" fill="#1e2435"/>'
    '<text x="320" y="190" text-anchor="middle" fill="#94a3b8" font-size="20" '
    'font-family="system-ui,sans-serif">Preview unavailable</text></svg>'
)


def _thumbnail_request_headers(url: str) -> dict[str, str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    }
    if "licdn.com" in url or "linkedin.com" in url:
        headers["Referer"] = "https://www.linkedin.com/"
    elif "tiktokcdn.com" in url or "tiktok.com" in url:
        headers["Referer"] = "https://www.tiktok.com/"
    elif "instagram.com" in url or "cdninstagram.com" in url:
        headers["Referer"] = "https://www.instagram.com/"
    elif "fbcdn.net" in url or "facebook.com" in url:
        headers["Referer"] = "https://www.facebook.com/"
    return headers


async def _fetch_thumbnail_response(url: str) -> Response:
    if not url.startswith("http"):
        return Response(status_code=400, content="Invalid URL")

    cache_key = build_cache_key("thumb", url)
    cached = get_json(cache_key)
    if cached:
        return Response(
            content=bytes.fromhex(cached["data"]),
            media_type=cached["content_type"],
            headers={"Cache-Control": "public, max-age=3600"},
        )

    try:
        async with httpx.AsyncClient(timeout=_THUMBNAIL_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url, headers=_thumbnail_request_headers(url))
        if resp.status_code != 200:
            raise ValueError(f"Upstream returned {resp.status_code}")
        content_type = resp.headers.get("content-type", "image/jpeg")
        if not content_type.startswith("image/"):
            raise ValueError(f"Upstream returned non-image content-type: {content_type}")
        data_hex = resp.content.hex()
        set_json(cache_key, {"data": data_hex, "content_type": content_type}, ttl_seconds=3600)
        return Response(
            content=resp.content,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except Exception:
        return Response(
            content=_FALLBACK_SVG,
            media_type="image/svg+xml",
            headers={"Cache-Control": "public, max-age=300"},
        )


@router.post("/resolve", response_model=ResolveVideoResponse)
def resolve_video(
    payload: ResolveVideoRequest, request: Request, db: Session = Depends(get_db)
) -> ResolveVideoResponse:
    enforce_rate_limit(request)
    url = str(payload.url)
    cache_key = build_cache_key("resolve", url)
    metadata = get_json(cache_key) or resolver.resolve(url)
    set_json(cache_key, metadata)

    existing = db.query(VideoRequest).filter(VideoRequest.url == url).first()
    if existing:
        video_request = existing
        video_request.title = metadata["title"]
        video_request.thumbnail_url = metadata["thumbnail_url"]
        video_request.duration = metadata["duration"]
        video_request.formats = metadata["formats"]
        video_request.playlist_entries = metadata["playlist_entries"]
        video_request.is_playlist = metadata["is_playlist"]
        video_request.items_count = metadata["items_count"]
    else:
        video_request = VideoRequest(
            url=url,
            platform=metadata["platform"],
            title=metadata["title"],
            thumbnail_url=metadata["thumbnail_url"],
            duration=metadata["duration"],
            formats=metadata["formats"],
            playlist_entries=metadata["playlist_entries"],
            is_playlist=metadata["is_playlist"],
            items_count=metadata["items_count"],
        )
        db.add(video_request)

    db.commit()
    db.refresh(video_request)

    return ResolveVideoResponse(
        request_id=video_request.id,
        platform=video_request.platform,
        title=video_request.title,
        thumbnail_url=video_request.thumbnail_url or "",
        duration=video_request.duration,
        source_url=video_request.url,
        formats=[VideoFormatResponse(**fmt) for fmt in video_request.formats],
        is_playlist=video_request.is_playlist,
        items_count=video_request.items_count,
        legal_notice="Download only content you own or have permission to use.",
    )


@router.get("/{request_id}/thumbnail")
async def proxy_thumbnail_by_request(
    request_id: str, db: Session = Depends(get_db)
) -> Response:
    """Serve thumbnail for a resolved video by DB id (short URL, no query-string limits)."""
    video_request = db.get(VideoRequest, request_id)
    if not video_request or not video_request.thumbnail_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found for this request.",
        )
    return await _fetch_thumbnail_response(video_request.thumbnail_url)


@router.get("/thumbnail")
async def proxy_thumbnail(url: str = Query(..., description="Remote thumbnail URL")) -> Response:
    """Proxy a thumbnail URL server-side to avoid CORS and signed-URL issues."""
    return await _fetch_thumbnail_response(url)
