from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO

from fastapi import HTTPException, status


class StorageProvider(ABC):
    @abstractmethod
    def save(self, key: str, source: str | BinaryIO, content_type: str | None = None) -> str:
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        pass

    @abstractmethod
    def get_local_path(self, key: str) -> Path:
        pass

    @abstractmethod
    def get_signed_url(self, key: str, expiry_seconds: int = 3600) -> str | None:
        pass

    @abstractmethod
    def to_public_url(self, stored_ref: str | None) -> str | None:
        pass


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_path: Path) -> None:
        self.base_path = base_path
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        path = (self.base_path / key).resolve()
        if self.base_path.resolve() not in path.parents and path != self.base_path.resolve():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid storage key.")
        return path

    def save(self, key: str, source: str | BinaryIO, content_type: str | None = None) -> str:
        dest = self._resolve(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(source, str):
            src = Path(source)
            dest.write_bytes(src.read_bytes())
        else:
            dest.write_bytes(source.read())
        return str(dest)

    def delete(self, key: str) -> None:
        path = self._resolve(key)
        if path.is_file():
            path.unlink()

    def exists(self, key: str) -> bool:
        return self._resolve(key).is_file()

    def get_local_path(self, key: str) -> Path:
        path = self._resolve(key)
        if not path.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
        return path

    def get_signed_url(self, key: str, expiry_seconds: int = 3600) -> str | None:
        return None

    def to_public_url(self, stored_ref: str | None) -> str | None:
        if not stored_ref:
            return None
        return f"/api/v1/media/files/{Path(stored_ref).name}"


class S3StorageProvider(StorageProvider):
    """Supports AWS S3, Cloudflare R2, and MinIO via endpoint_url."""

    def __init__(
        self,
        bucket: str,
        region: str,
        access_key: str | None,
        secret_key: str | None,
        endpoint_url: str | None = None,
        local_cache: Path | None = None,
    ) -> None:
        import boto3

        self.bucket = bucket
        self.local_cache = local_cache or Path("/tmp/storage-cache")
        self.local_cache.mkdir(parents=True, exist_ok=True)
        self.client = boto3.client(
            "s3",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            endpoint_url=endpoint_url,
        )

    def save(self, key: str, source: str | BinaryIO, content_type: str | None = None) -> str:
        extra: dict = {}
        if content_type:
            extra["ContentType"] = content_type
        if isinstance(source, str):
            self.client.upload_file(source, self.bucket, key, ExtraArgs=extra or None)
        else:
            self.client.upload_fileobj(source, self.bucket, key, ExtraArgs=extra or None)
        return f"s3://{self.bucket}/{key}"

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except self.client.exceptions.ClientError:
            return False

    def get_local_path(self, key: str) -> Path:
        cached = self.local_cache / key.replace("/", "_")
        if not cached.is_file():
            cached.parent.mkdir(parents=True, exist_ok=True)
            self.client.download_file(self.bucket, key, str(cached))
        return cached

    def get_signed_url(self, key: str, expiry_seconds: int = 3600) -> str | None:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expiry_seconds,
        )

    def to_public_url(self, stored_ref: str | None) -> str | None:
        if not stored_ref:
            return None
        if stored_ref.startswith("s3://"):
            key = stored_ref.split("/", 3)[-1]
            return self.get_signed_url(key)
        return stored_ref
