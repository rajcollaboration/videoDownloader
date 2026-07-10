import logging
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.clip import Clip
from app.models.media_video import MediaVideo
from app.models.processing import AuditLog, ProcessingJob
from app.services.media_storage import clip_storage, temp_storage, video_storage

logger = logging.getLogger(__name__)


class FFmpegService:
    def extract_audio(self, video_path: Path, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            str(output_path),
        ]
        subprocess.run(cmd, check=True, capture_output=True, timeout=3600)
        return output_path

    def generate_clip(
        self,
        video_path: Path,
        output_path: Path,
        start_time: float,
        end_time: float,
        copy_codec: bool = True,
    ) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        duration = max(end_time - start_time, 0.1)
        if copy_codec:
            cmd = [
                "ffmpeg",
                "-y",
                "-ss",
                str(start_time),
                "-i",
                str(video_path),
                "-t",
                str(duration),
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                str(output_path),
            ]
        else:
            cmd = [
                "ffmpeg",
                "-y",
                "-ss",
                str(start_time),
                "-i",
                str(video_path),
                "-t",
                str(duration),
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "18",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-movflags",
                "+faststart",
                str(output_path),
            ]
        subprocess.run(cmd, check=True, capture_output=True, timeout=3600)
        return output_path


ffmpeg_service = FFmpegService()


class AuditService:
    def log(
        self,
        db: Session,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        user_id: str | None = None,
        details: dict | None = None,
        ip_address: str | None = None,
    ) -> None:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()


class ProcessingJobService:
    def create(
        self,
        db: Session,
        job_type: str,
        video_id: str | None = None,
        user_id: str | None = None,
        clip_id: str | None = None,
        message: str = "Queued",
        metadata: dict | None = None,
    ) -> ProcessingJob:
        job = ProcessingJob(
            video_id=video_id,
            user_id=user_id,
            clip_id=clip_id,
            job_type=job_type,
            status="pending",
            message=message,
            metadata_json=metadata,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def update_progress(
        self,
        db: Session,
        job_id: str,
        progress: int,
        message: str,
        status: str | None = None,
    ) -> None:
        job = db.get(ProcessingJob, job_id)
        if not job:
            return
        job.progress = progress
        job.message = message
        if status:
            job.status = status
        if status == "processing" and not job.started_at:
            job.started_at = datetime.now(UTC)
        if status in ("completed", "failed"):
            job.completed_at = datetime.now(UTC)
        job.updated_at = datetime.now(UTC)
        db.commit()

    def fail(self, db: Session, job_id: str, error: str) -> None:
        job = db.get(ProcessingJob, job_id)
        if not job:
            return
        job.status = "failed"
        job.error_detail = error[:1000]
        job.message = "Failed"
        job.completed_at = datetime.now(UTC)
        db.commit()


class ClipService:
    def create_clip_record(
        self,
        db: Session,
        video_id: str,
        title: str,
        start_time: float,
        end_time: float,
        user_id: str | None = None,
        source: str = "manual",
        search_query: str | None = None,
    ) -> Clip:
        if end_time <= start_time:
            raise ValueError("End time must be after start time")
        clip = Clip(
            video_id=video_id,
            user_id=user_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=round(end_time - start_time, 3),
            source=source,
            search_query=search_query,
            status="pending",
        )
        db.add(clip)
        db.commit()
        db.refresh(clip)
        return clip

    def get_video_path(self, video: MediaVideo) -> Path:
        if video.storage_key:
            return video_storage.get_local_path(video.storage_key)
        if video.file_path:
            return Path(video.file_path)
        raise FileNotFoundError("Video file not found")


audit_service = AuditService()
processing_job_service = ProcessingJobService()
clip_service = ClipService()
