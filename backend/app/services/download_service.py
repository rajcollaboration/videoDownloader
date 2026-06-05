from sqlalchemy.orm import Session

from app.models.download import DownloadJob, PlaylistItem
from app.models.video import VideoRequest
from app.workers.tasks import process_download


class DownloadService:
    def create_job(
        self, db: Session, request_id: str, format_id: str, audio_only: bool = False
    ) -> DownloadJob:
        video_request = db.get(VideoRequest, request_id)
        if not video_request:
            raise ValueError("Video request not found.")

        job = DownloadJob(
            request_id=request_id,
            format_id=format_id,
            audio_only=audio_only,
            status="pending",
            progress=0,
            message="Queued for processing",
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        if video_request.is_playlist:
            for entry in video_request.playlist_entries:
                db.add(
                    PlaylistItem(
                        job_id=job.id,
                        source_url=entry["source_url"],
                        title=entry["title"],
                        duration=entry.get("duration"),
                        position=entry["position"],
                    )
                )
            db.commit()

        process_download.delay(job.id)
        return job
