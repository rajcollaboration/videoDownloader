from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class UserRegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)


class UserLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str


class MediaVideoResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    source_type: str
    source_url: str | None = None
    status: str
    duration_seconds: float | None = None
    file_size: int | None = None
    width: int | None = None
    height: int | None = None
    thumbnail_path: str | None = None
    playback_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MediaVideoListResponse(BaseModel):
    videos: list[MediaVideoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProcessingJobResponse(BaseModel):
    id: str
    video_id: str | None = None
    clip_id: str | None = None
    job_type: str
    status: str
    progress: int
    message: str
    error_detail: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class TranscriptSegmentResponse(BaseModel):
    id: str
    text: str
    start_time: float
    end_time: float
    confidence: float | None = None
    speaker: str | None = None

    model_config = {"from_attributes": True}


class TranscriptResponse(BaseModel):
    id: str
    video_id: str
    full_text: str | None = None
    language: str | None = None
    confidence: float | None = None
    status: str
    segments: list[TranscriptSegmentResponse] = []

    model_config = {"from_attributes": True}


class TopicResponse(BaseModel):
    id: str
    title: str
    summary: str | None = None
    start_time: float
    end_time: float
    confidence: float | None = None
    key_decisions: list[Any] | None = None
    action_items: list[Any] | None = None
    risks: list[Any] | None = None
    issues_raised: list[Any] | None = None

    model_config = {"from_attributes": True}


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)


class SearchResultResponse(BaseModel):
    start_time: float
    end_time: float
    confidence: float
    summary: str
    text: str | None = None
    chunk_id: str | None = None


class ClipCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    start_time: float = Field(ge=0)
    end_time: float = Field(gt=0)
    source: str = "manual"
    search_query: str | None = None


class ClipBatchCreateRequest(BaseModel):
    clips: list[ClipCreateRequest]


class ClipResponse(BaseModel):
    id: str
    video_id: str
    title: str
    start_time: float
    end_time: float
    duration_seconds: float
    source: str
    search_query: str | None = None
    status: str
    progress: int
    download_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class VideoFromUrlRequest(BaseModel):
    url: str
    title: str | None = None


class VideoFromDownloadRequest(BaseModel):
    download_job_id: str
    title: str | None = None


class VideoDetailResponse(MediaVideoResponse):
    transcript: TranscriptResponse | None = None
    topics: list[TopicResponse] = []
    clips: list[ClipResponse] = []
    jobs: list[ProcessingJobResponse] = []
