from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class BlogPostBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    slug: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    excerpt: Optional[str] = None
    content: str = ""
    status: str = Field("draft", pattern=r"^(draft|published)$")
    featured_image_url: Optional[str] = None
    category: Optional[str] = None
    tags: list[str] = []
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image_url: Optional[str] = None
    canonical_url: Optional[str] = None
    author: str = "ClipFetch Team"


class BlogPostCreate(BlogPostBase):
    pass


class BlogPostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=512)
    slug: Optional[str] = Field(None, min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    excerpt: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^(draft|published)$")
    featured_image_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image_url: Optional[str] = None
    canonical_url: Optional[str] = None
    author: Optional[str] = None


class BlogPostPublic(BlogPostBase):
    id: str
    view_count: int
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BlogPostSummary(BaseModel):
    id: str
    slug: str
    title: str
    excerpt: Optional[str]
    status: str
    featured_image_url: Optional[str]
    category: Optional[str]
    tags: list[str]
    author: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BlogListResponse(BaseModel):
    posts: list[BlogPostSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
