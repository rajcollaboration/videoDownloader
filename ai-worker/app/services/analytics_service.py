from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.download import DownloadJob
from app.models.video import VideoRequest
from app.schemas.admin import JobHistoryItem, OverviewMetric, OverviewResponse


class AnalyticsService:
    def build_overview(self, db: Session) -> OverviewResponse:
        total_downloads = db.query(func.count(DownloadJob.id)).scalar() or 0
        failed_downloads = (
            db.query(func.count(DownloadJob.id)).filter(DownloadJob.status == "failed").scalar() or 0
        )
        top_platform = (
            db.query(VideoRequest.platform, func.count(VideoRequest.id).label("count"))
            .group_by(VideoRequest.platform)
            .order_by(func.count(VideoRequest.id).desc())
            .first()
        )

        failure_rate = f"{(failed_downloads / total_downloads * 100):.1f}%" if total_downloads else "0.0%"

        recent_rows = (
            db.query(DownloadJob, VideoRequest)
            .join(VideoRequest, DownloadJob.request_id == VideoRequest.id)
            .order_by(DownloadJob.created_at.desc())
            .limit(8)
            .all()
        )

        return OverviewResponse(
            metrics=[
                OverviewMetric(label="Downloads processed", value=f"{total_downloads:,}"),
                OverviewMetric(
                    label="Most used platform",
                    value=top_platform[0] if top_platform else "No data yet",
                ),
                OverviewMetric(label="Failure rate", value=failure_rate),
            ],
            recentJobs=[
                JobHistoryItem(
                    jobId=job.id,
                    title=request.title,
                    platform=request.platform,
                    status=job.status,
                    progress=job.progress,
                    createdAt=job.created_at.isoformat(),
                    isPlaylist=request.is_playlist,
                )
                for job, request in recent_rows
            ],
        )
