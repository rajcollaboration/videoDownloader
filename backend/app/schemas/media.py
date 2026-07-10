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
    clips: list[ClipResponse] = []
    jobs: list[ProcessingJobResponse] = []


class WatermarkConfigSchema(BaseModel):
    type: str  # "text" | "logo"
    text: str | None = None
    logo_path: str | None = None
    position: str = "center"
    x: int | None = None
    y: int | None = None
    opacity: float = 1.0
    scale: float | None = None
    rotation: float = 0.0
    margin: int = 10
    padding: int = 0
    font_name: str | None = "Arial"
    font_size: int = 24
    font_color: str = "#FFFFFF"
    outline_color: str | None = None
    outline_width: int = 0
    shadow_color: str | None = None
    shadow_offset_x: int = 2
    shadow_offset_y: int = 2
    start_time: float | None = None
    end_time: float | None = None


class WatermarkRequest(BaseModel):
    title: str
    watermarks: list[WatermarkConfigSchema]


class BatchWatermarkRequest(BaseModel):
    video_ids: list[str]
    watermarks: list[WatermarkConfigSchema]


class ConvertRequest(BaseModel):
    title: str
    format: str
    quality_preset: str = "medium"
    resolution: str | None = None
    fps: int | None = None
    bitrate: str | None = None
    codec: str | None = None


class ExtractAudioRequest(BaseModel):
    title: str
    format: str
    bitrate: str | None = None
    preserve_metadata: bool = True
