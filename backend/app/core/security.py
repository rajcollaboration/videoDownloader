from collections import defaultdict, deque
from time import time

from fastapi import HTTPException, Request, status

from app.core.config import settings

_requests: dict[str, deque[float]] = defaultdict(deque)


def enforce_rate_limit(request: Request) -> None:
    # Resolve the client IP, prioritizing standard proxy headers since the app
    # typically runs behind a reverse proxy (e.g. Nginx).
    forwarded_for = request.headers.get("x-forwarded-for")
    real_ip = request.headers.get("x-real-ip")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, the first one is the client
        identifier = forwarded_for.split(",")[0].strip()
    elif real_ip:
        identifier = real_ip.strip()
    else:
        identifier = request.client.host if request.client else "anonymous"

    now = time()
    window = _requests[identifier]

    while window and now - window[0] > 60:
        window.popleft()

    if len(window) >= settings.rate_limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again shortly.",
        )

    window.append(now)

