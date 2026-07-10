from collections import defaultdict, deque
from time import time

from fastapi import HTTPException, Request, status

from app.core.config import settings

_requests: dict[str, deque[float]] = defaultdict(deque)


def enforce_rate_limit(request: Request) -> None:
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
