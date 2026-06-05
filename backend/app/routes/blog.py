import re
import uuid
from datetime import UTC, datetime
from io import BytesIO
from math import ceil
from pathlib import Path

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, status
from PIL import Image
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.blog import BlogPost
from app.schemas.blog import (
    BlogListResponse,
    BlogPostCreate,
    BlogPostPublic,
    BlogPostSummary,
    BlogPostUpdate,
)

router = APIRouter()

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
_MAX_IMAGE_DIM = 1920


def _require_admin(x_admin_key: str = Header(default="")) -> None:
    if not settings.admin_api_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-Admin-Key header required.",
        )


def _slugify(text: str) -> str:
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:255] or "post"


# ─── Public endpoints ──────────────────────────────────────────────────────────

@router.get("/", response_model=BlogListResponse)
def list_published_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    category: str | None = None,
    tag: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
) -> BlogListResponse:
    query = db.query(BlogPost).filter(BlogPost.status == "published")

    if category:
        query = query.filter(BlogPost.category == category)
    if q:
        like = f"%{q}%"
        query = query.filter(
            BlogPost.title.ilike(like) | BlogPost.excerpt.ilike(like)
        )
    if tag:
        query = query.filter(BlogPost.tags.contains([tag]))

    total = query.count()
    posts = (
        query.order_by(BlogPost.published_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return BlogListResponse(
        posts=[BlogPostSummary.model_validate(p) for p in posts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


# IMPORTANT: /categories must be declared BEFORE /{slug} to avoid being swallowed
# by the wildcard slug route.
@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)) -> list[str]:
    """Return distinct categories from published posts, sorted alphabetically."""
    rows = (
        db.query(BlogPost.category)
        .filter(BlogPost.status == "published", BlogPost.category.isnot(None))
        .distinct()
        .all()
    )
    return sorted(r[0] for r in rows if r[0])


@router.get("/{slug}", response_model=BlogPostPublic)
def get_post_by_slug(slug: str, db: Session = Depends(get_db)) -> BlogPostPublic:
    post = db.query(BlogPost).filter(
        BlogPost.slug == slug, BlogPost.status == "published"
    ).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    post.view_count = (post.view_count or 0) + 1
    db.commit()
    db.refresh(post)
    return BlogPostPublic.model_validate(post)


# ─── Admin endpoints (protected by X-Admin-Key header) ────────────────────────

@router.get("/admin/posts", response_model=BlogListResponse, dependencies=[Depends(_require_admin)])
def admin_list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
) -> BlogListResponse:
    query = db.query(BlogPost)
    if status_filter:
        query = query.filter(BlogPost.status == status_filter)
    total = query.count()
    posts = (
        query.order_by(BlogPost.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return BlogListResponse(
        posts=[BlogPostSummary.model_validate(p) for p in posts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.get(
    "/admin/categories",
    response_model=list[str],
    dependencies=[Depends(_require_admin)],
)
def admin_list_categories(db: Session = Depends(get_db)) -> list[str]:
    """Return distinct categories from ALL posts (drafts + published)."""
    rows = (
        db.query(BlogPost.category)
        .filter(BlogPost.category.isnot(None))
        .distinct()
        .all()
    )
    return sorted(r[0] for r in rows if r[0])


@router.post(
    "/admin/posts",
    response_model=BlogPostPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_require_admin)],
)
def create_post(payload: BlogPostCreate, db: Session = Depends(get_db)) -> BlogPostPublic:
    slug = payload.slug or _slugify(payload.title)

    if db.query(BlogPost).filter(BlogPost.slug == slug).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists.")

    published_at = datetime.now(UTC) if payload.status == "published" else None

    post = BlogPost(
        slug=slug,
        title=payload.title,
        excerpt=payload.excerpt,
        content=payload.content,
        status=payload.status,
        featured_image_url=payload.featured_image_url,
        category=payload.category,
        tags=payload.tags,
        seo_title=payload.seo_title,
        seo_description=payload.seo_description,
        seo_keywords=payload.seo_keywords,
        og_image_url=payload.og_image_url,
        canonical_url=payload.canonical_url,
        author=payload.author,
        published_at=published_at,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return BlogPostPublic.model_validate(post)


@router.get(
    "/admin/posts/{post_id}",
    response_model=BlogPostPublic,
    dependencies=[Depends(_require_admin)],
)
def admin_get_post(post_id: str, db: Session = Depends(get_db)) -> BlogPostPublic:
    post = db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    return BlogPostPublic.model_validate(post)


@router.put(
    "/admin/posts/{post_id}",
    response_model=BlogPostPublic,
    dependencies=[Depends(_require_admin)],
)
def update_post(post_id: str, payload: BlogPostUpdate, db: Session = Depends(get_db)) -> BlogPostPublic:
    post = db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    update_data = payload.model_dump(exclude_unset=True)

    if update_data.get("status") == "published" and post.status != "published":
        update_data.setdefault("published_at", datetime.now(UTC))

    for field, value in update_data.items():
        setattr(post, field, value)

    db.commit()
    db.refresh(post)
    return BlogPostPublic.model_validate(post)


@router.delete(
    "/admin/posts/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(_require_admin)],
)
def delete_post(post_id: str, db: Session = Depends(get_db)) -> None:
    post = db.get(BlogPost, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    db.delete(post)
    db.commit()


@router.post("/admin/images/upload", dependencies=[Depends(_require_admin)])
async def upload_blog_image(file: UploadFile = File(...)) -> dict:
    """
    Upload, compress, and convert a blog image to WebP.
    Returns the served URL path for use in posts.
    """
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only JPEG, PNG, WebP, and GIF images are allowed.",
        )

    data = await file.read()
    if len(data) > _MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 5 MB limit.",
        )

    try:
        img = Image.open(BytesIO(data))
        # Normalize mode: keep RGBA for WebP transparency, else RGB
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "transparency" in img.info else "RGB")

        w, h = img.size
        if w > _MAX_IMAGE_DIM:
            img = img.resize((_MAX_IMAGE_DIM, int(h * _MAX_IMAGE_DIM / w)), Image.LANCZOS)

        buf = BytesIO()
        img.save(buf, format="WEBP", quality=85, method=4)
        buf.seek(0)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Image processing failed: {exc}",
        )

    images_dir = Path(settings.local_storage_path) / "blog-images"
    images_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.webp"
    (images_dir / filename).write_bytes(buf.read())

    return {"url": f"/api/media/blog/{filename}", "filename": filename}
