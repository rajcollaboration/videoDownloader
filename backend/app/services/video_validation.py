import logging
import mimetypes
import subprocess
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
    "video/x-msvideo",
    "video/avi",
    # Audio formats
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "audio/x-flac",
    "audio/mp4",
    "audio/x-m4a",
    # Image formats
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
}


class VideoValidationService:
    def validate_extension(self, filename: str) -> str:
        ext = Path(filename).suffix.lstrip(".").lower()
        if ext not in settings.allowed_video_extensions_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported format. Allowed: {', '.join(settings.allowed_video_extensions_list)}",
            )
        return ext

    def validate_mime(self, content_type: str | None, filename: str) -> str:
        guessed, _ = mimetypes.guess_type(filename)
        mime = content_type or guessed or ""
        if mime and mime not in ALLOWED_MIME_TYPES and not mime.startswith("video/") and not mime.startswith("audio/") and not mime.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid MIME type: {mime}",
            )
        return mime or "application/octet-stream"

    def validate_size(self, size: int) -> None:
        max_bytes = settings.max_upload_size_mb * 1024 * 1024
        if size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds {settings.max_upload_size_mb}MB limit",
            )

    async def save_upload(self, file: UploadFile, dest: Path) -> tuple[int, str]:
        ext = self.validate_extension(file.filename or "video.mp4")
        mime = self.validate_mime(file.content_type, file.filename or f"video.{ext}")
        dest.parent.mkdir(parents=True, exist_ok=True)
        size = 0
        with dest.open("wb") as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                self.validate_size(size)
                out.write(chunk)
        return size, mime

    def probe_video(self, path: Path) -> dict:
        ext = path.suffix.lower()
        if ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
            try:
                from PIL import Image
                with Image.open(path) as img:
                    return {
                        "duration_seconds": 0.0,
                        "width": img.width,
                        "height": img.height,
                        "fps": 0.0,
                    }
            except Exception as exc:
                logger.warning("PIL probe failed on %s: %s", path, exc)
                
        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(path),
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=60)
            import json

            data = json.loads(result.stdout)
            duration = float(data.get("format", {}).get("duration", 0))
            video_stream = next(
                (s for s in data.get("streams", []) if s.get("codec_type") == "video"),
                {},
            )
            return {
                "duration_seconds": duration,
                "width": video_stream.get("width"),
                "height": video_stream.get("height"),
                "fps": _parse_fps(video_stream.get("r_frame_rate", "0/1")),
            }
        except Exception as exc:
            logger.warning("ffprobe failed for %s: %s", path, exc)
            return {"duration_seconds": None, "width": None, "height": None, "fps": None}


def _parse_fps(rate: str) -> float | None:
    try:
        num, den = rate.split("/")
        return round(int(num) / max(int(den), 1), 2)
    except (ValueError, ZeroDivisionError):
        return None


video_validation = VideoValidationService()
