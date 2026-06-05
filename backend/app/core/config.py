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
    storage_mode: str = "local"
    local_storage_path: Path = Path("/app/storage")
    rate_limit_per_minute: int = 20
    max_playlist_size: int = 1000
    allowed_origins: str = "http://localhost:3000"
    enable_youtube: bool = False
    admin_api_key: str = "change-me-admin-key"

    # yt-dlp tuning
    ytdlp_concurrent_fragments: int = 4
    ytdlp_external_downloader: str | None = None
    ytdlp_external_downloader_args: str | None = None
    ytdlp_http_chunk_size: int | None = None

    @property
    def allowed_origins_list(self) -> list[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
