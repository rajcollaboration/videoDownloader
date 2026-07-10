from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8001
    internal_api_key: str = "change-me-ai-key"
    database_url: str = ""
    whisper_model_size: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimensions: int = 384


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
