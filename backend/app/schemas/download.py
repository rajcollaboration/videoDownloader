from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CreateDownloadRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    request_id: str = Field(alias="requestId")
    format_id: str = Field(alias="formatId")
    audio_only: bool = Field(default=False, alias="audioOnly")


class DownloadResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: str = Field(alias="jobId")
    status: str
    progress: int
    message: str


class PlaylistItemResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    position: int
    status: str
    progress: int
    duration: str | None = None
    output_path: str | None = Field(default=None, alias="outputPath")
    stage: str | None = None
    eta_seconds: int | None = Field(default=None, alias="etaSeconds")
    speed_bps: float | None = Field(default=None, alias="speedBps")
    downloaded_bytes: int | None = Field(default=None, alias="downloadedBytes")
    total_bytes: int | None = Field(default=None, alias="totalBytes")


class DownloadStatusResponse(DownloadResponse):
    output_path: str | None = Field(default=None, alias="outputPath")
    updated_at: datetime = Field(alias="updatedAt")
    playlist_items: list[PlaylistItemResponse] = Field(default_factory=list, alias="playlistItems")
    stage: str | None = None
    eta_seconds: int | None = Field(default=None, alias="etaSeconds")
    speed_bps: float | None = Field(default=None, alias="speedBps")
    downloaded_bytes: int | None = Field(default=None, alias="downloadedBytes")
    total_bytes: int | None = Field(default=None, alias="totalBytes")
