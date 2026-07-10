import logging
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import httpx
from sqlalchemy.orm import Session

from app.models.download import DownloadJob
from app.models.media_video import MediaVideo
from app.models.processing import ProcessingJob
from app.services.media_processing import audit_service, processing_job_service
from app.services.media_storage import video_storage
from app.services.video_validation import video_validation

logger = logging.getLogger(__name__)


class MediaVideoService:
    def create_from_upload(
        self,
        db: Session,
        title: str,
        local_path: Path,
        mime_type: str,
        file_size: int,
        user_id: str | None = None,
        description: str | None = None,
    ) -> MediaVideo:
        probe = video_validation.probe_video(local_path)
        storage_key = f"{uuid4()}{local_path.suffix}"
        stored = video_storage.save(storage_key, str(local_path), mime_type)

        video = MediaVideo(
            user_id=user_id,
            title=title,
            description=description,
            source_type="upload",
            file_path=stored if not stored.startswith("s3://") else None,
            storage_key=storage_key if stored.startswith("s3://") else storage_key,
            mime_type=mime_type,
            file_size=file_size,
            duration_seconds=probe.get("duration_seconds"),
            width=probe.get("width"),
            height=probe.get("height"),
            fps=probe.get("fps"),
            status="ready",
        )
        db.add(video)
        db.commit()
        db.refresh(video)

        audit_service.log(db, "video.upload", "media_video", video.id, user_id)
        return video

    def create_from_download_job(
        self, db: Session, download_job_id: str, user_id: str | None = None
    ) -> MediaVideo:
        job = db.get(DownloadJob, download_job_id)
        if not job or job.status != "completed" or not job.output_path:
            raise ValueError("Download job not completed or missing output")

        path = Path(job.output_path)
        if not path.is_file() and not str(job.output_path).startswith("s3://"):
            raise FileNotFoundError("Downloaded file not found")

        probe = video_validation.probe_video(path) if path.is_file() else {}
        storage_key = f"{uuid4()}{path.suffix if path.suffix else '.mp4'}"

        if path.is_file():
            stored = video_storage.save(storage_key, str(path), "video/mp4")
        else:
            stored = job.output_path

        video = MediaVideo(
            user_id=user_id,
            title=f"Download {download_job_id[:8]}",
            source_type="download",
            download_job_id=download_job_id,
            file_path=stored if not str(stored).startswith("s3://") else None,
            storage_key=storage_key,
            mime_type="video/mp4",
            file_size=path.stat().st_size if path.is_file() else None,
            duration_seconds=probe.get("duration_seconds"),
            width=probe.get("width"),
            height=probe.get("height"),
            fps=probe.get("fps"),
            status="ready",
        )
        db.add(video)
        db.commit()
        db.refresh(video)
        audit_service.log(db, "video.from_download", "media_video", video.id, user_id)
        return video

    def create_from_url(
        self, db: Session, url: str, title: str | None = None, user_id: str | None = None
    ) -> tuple[MediaVideo, ProcessingJob]:
        video = MediaVideo(
            user_id=user_id,
            title=title or f"URL Import {url[:50]}",
            source_type="url",
            source_url=url,
            status="pending",
        )
        db.add(video)
        db.commit()
        db.refresh(video)

        job = processing_job_service.create(
            db,
            job_type="video_download",
            video_id=video.id,
            user_id=user_id,
            message="Downloading from URL",
            metadata={"url": url},
        )
        from app.workers.media_tasks import download_video_from_url

        task = download_video_from_url.delay(video.id, job.id, url)
        job.celery_task_id = task.id
        db.commit()
        return video, job

    def list_videos(
        self,
        db: Session,
        user_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
    ) -> tuple[list[MediaVideo], int]:
        query = db.query(MediaVideo).filter(MediaVideo.deleted_at.is_(None))
        if user_id:
            query = query.filter(MediaVideo.user_id == user_id)
        if status:
            query = query.filter(MediaVideo.status == status)
        total = query.count()
        items = (
            query.order_by(MediaVideo.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def soft_delete(self, db: Session, video_id: str) -> None:
        video = db.get(MediaVideo, video_id)
        if video:
            video.deleted_at = datetime.now(UTC)
            db.commit()


media_video_service = MediaVideoService()
