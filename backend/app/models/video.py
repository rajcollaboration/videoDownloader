from datetime import UTC, datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VideoRequest(Base):
    __tablename__ = "video_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    url: Mapped[str] = mapped_column(String(2048), nullable=False, unique=True)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    thumbnail_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    duration: Mapped[str] = mapped_column(String(50), nullable=False)
    formats: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    playlist_entries: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    is_playlist: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    items_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
