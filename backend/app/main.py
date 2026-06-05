import logging
import mimetypes
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

# Ensure image MIME types are registered — some Alpine/Debian Docker images
# ship a minimal mimetypes database that lacks WebP and other modern types.
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/jpeg", ".jpeg")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/gif", ".gif")

from app.core.config import settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import engine
from app.routes import analytics, blog, downloads, health, videos

configure_logging()
Base.metadata.create_all(bind=engine)

# Ensure blog image upload directory exists and serve it as static files
_BLOG_IMAGES_DIR = Path(settings.local_storage_path) / "blog-images"
_BLOG_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="ClipFetch API",
    version="0.1.0",
    summary="Async video downloader API for supported public URLs",
)

REQUEST_COUNT = Counter(
    "clipfetch_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)
REQUEST_LATENCY = Histogram(
    "clipfetch_http_request_duration_seconds",
    "HTTP request duration",
    ["method", "path"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log incoming request body to help diagnose 422 validation errors."""
    if request.method in ("POST", "PUT", "PATCH"):
        body = await request.body()
        logger.debug(
            "Incoming %s %s — body: %s",
            request.method,
            request.url.path,
            body.decode("utf-8", errors="replace"),
        )
    response = await call_next(request)
    if response.status_code == 422:
        logger.warning(
            "422 Unprocessable Entity on %s %s",
            request.method,
            request.url.path,
        )
    return response


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    with REQUEST_LATENCY.labels(request.method, request.url.path).time():
        response = await call_next(request)
    REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()
    return response

app.mount("/media/blog", StaticFiles(directory=str(_BLOG_IMAGES_DIR)), name="blog-images")

app.include_router(health.router, prefix="/v1", tags=["health"])
app.include_router(videos.router, prefix="/v1/videos", tags=["videos"])
app.include_router(downloads.router, prefix="/v1/downloads", tags=["downloads"])
app.include_router(analytics.router, prefix="/v1/analytics", tags=["analytics"])
app.include_router(blog.router, prefix="/v1/blog", tags=["blog"])


@app.get("/metrics", include_in_schema=False)
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
