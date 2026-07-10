from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    secret_key: str = "change-me"
    database_url: str
    redis_url: str
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "us-east-1"
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None
    storage_mode: str = "local"
    local_storage_path: Path = Path("/app/storage")
    rate_limit_per_minute: int = 20
    max_playlist_size: int = 1000
    allowed_origins: str = "http://localhost:3000"
    enable_youtube: bool = False
    admin_api_key: str = "change-me-admin-key"

    # AI / Video processing
    ai_worker_url: str = "http://ai-worker:8001"
    ai_worker_internal_key: str = "change-me-ai-key"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    max_upload_size_mb: int = 2048
    allowed_video_extensions: str = "mp4,mov,webm,mkv,avi,mp3,wav,aac,ogg,flac,m4a"
    embedding_dimensions: int = 384
    whisper_model_size: str = "base"
    clip_storage_path: str = "clips"
    video_storage_path: str = "videos"
    temp_storage_path: str = "temp"
    signed_url_expiry_seconds: int = 3600

    # yt-dlp tuning
    ytdlp_concurrent_fragments: int = 4
    ytdlp_external_downloader: str | None = None
    ytdlp_external_downloader_args: str | None = None
    ytdlp_http_chunk_size: int | None = None
    ytdlp_cookies_file: str | None = None

    @property
    def allowed_origins_list(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]

    @property
    def allowed_video_extensions_list(self) -> list[str]:
        return [item.strip().lower() for item in self.allowed_video_extensions.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
