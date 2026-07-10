from pathlib import Path

from app.core.config import settings
from app.services.storage import StorageService
from app.services.storage_provider import LocalStorageProvider, S3StorageProvider, StorageProvider


def get_storage_provider(subdir: str = "") -> StorageProvider:
    base = Path(settings.local_storage_path)
    if subdir:
        base = base / subdir

    if settings.storage_mode == "s3" and settings.s3_bucket:
        return S3StorageProvider(
            bucket=settings.s3_bucket,
            region=settings.aws_region,
            access_key=settings.aws_access_key_id,
            secret_key=settings.aws_secret_access_key,
            endpoint_url=settings.s3_endpoint_url,
            local_cache=base / ".cache",
        )
    return LocalStorageProvider(base)


# Legacy download storage (unchanged behaviour)
legacy_storage = StorageService()

video_storage = get_storage_provider(settings.video_storage_path)
clip_storage = get_storage_provider(settings.clip_storage_path)
temp_storage = get_storage_provider(settings.temp_storage_path)
