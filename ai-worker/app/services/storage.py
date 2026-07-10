from pathlib import Path

import boto3
from fastapi import HTTPException, status

from app.core.config import settings


class StorageService:
    def __init__(self) -> None:
        self.mode = settings.storage_mode
        self.local_storage = Path(settings.local_storage_path)
        self.local_storage.mkdir(parents=True, exist_ok=True)

    def build_output_path(self, job_id: str, extension: str = "mp4") -> str:
        if self.mode == "s3":
            return f"{job_id}.{extension}"
        return str(self.local_storage / f"{job_id}.{extension}")

    def upload_file(self, local_path: str, key: str) -> str:
        if self.mode != "s3":
            return local_path

        client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        client.upload_file(local_path, settings.s3_bucket, key)
        return f"s3://{settings.s3_bucket}/{key}"

    def to_public_path(self, stored_path: str | None) -> str | None:
        if not stored_path:
            return None
        if self.mode == "s3":
            return stored_path
        return f"/api/v1/downloads/files/{Path(stored_path).name}"

    def resolve_local_file(self, filename: str) -> Path:
        path = (self.local_storage / filename).resolve()
        if self.local_storage.resolve() not in path.parents or not path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Download file not found.",
            )
        return path
