from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class ResolveVideoRequest(BaseModel):
    url: HttpUrl


class VideoFormatResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    label: str
    mime_type: str = Field(alias="mimeType")
    quality: str
    filesize_mb: float | None = Field(default=None, alias="filesizeMb")
    audio_only: bool = Field(default=False, alias="audioOnly")


class ResolveVideoResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    request_id: str = Field(alias="requestId")
    platform: str
    title: str
    thumbnail_url: str = Field(alias="thumbnailUrl")
    duration: str
    source_url: str = Field(alias="sourceUrl")
    formats: list[VideoFormatResponse]
    is_playlist: bool = Field(alias="isPlaylist")
    items_count: int | None = Field(default=None, alias="itemsCount")
    legal_notice: str = Field(
        default="Download only content you own or have permission to use.",
        alias="legalNotice",
    )
