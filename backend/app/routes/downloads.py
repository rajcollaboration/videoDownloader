from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.security import enforce_rate_limit
from app.db.session import get_db
from app.models.download import DownloadJob, PlaylistItem
from app.schemas.download import (
    CreateDownloadRequest,
    DownloadResponse,
    DownloadStatusResponse,
    PlaylistItemResponse,
    CreateBatchDownloadRequest,
)
from app.services import progress_store
from app.services.download_service import DownloadService
from app.services.storage import StorageService
from app.workers.tasks import cleanup_storage_file, process_single_video
from app.workers.celery_app import celery_app
from uuid import uuid4

router = APIRouter()
service = DownloadService()
storage = StorageService()


def _stage_for(job_status: str, fallback: str | None = None) -> str:
    if job_status == "completed":
        return "completed"
    if job_status == "failed":
        return "failed"
    if job_status == "pending":
        return "queued"
    return fallback or "processing"


def _as_int(v) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _as_float(v) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


@router.post(
    "",
    response_model=DownloadResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_download(
    payload: CreateDownloadRequest, request: Request, db: Session = Depends(get_db)
) -> DownloadResponse:
    enforce_rate_limit(request)

    try:
        job = service.create_job(
            db=db,
            request_id=payload.request_id,
            format_id=payload.format_id,
            audio_only=payload.audio_only,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return DownloadResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        message=job.message,
    )


@router.get("/{job_id}", response_model=DownloadStatusResponse, response_model_by_alias=True)
def get_download_status(job_id: str, db: Session = Depends(get_db)) -> DownloadStatusResponse:
    job = db.get(DownloadJob, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Download job not found.")

    playlist_items = (
        db.query(PlaylistItem).filter(PlaylistItem.job_id == job.id).order_by(PlaylistItem.position).all()
    )

    # Merge live yt-dlp state (speed / ETA / byte-level progress) from Redis.
    live = progress_store.read_job(job.id) if job.status not in ("completed", "failed") else {}

    # Prefer the higher of DB-persisted and live progress so the bar never regresses.
    effective_progress = max(job.progress or 0, int(live.get("progress") or 0))
    effective_message = live.get("message") or job.message
    effective_stage = live.get("stage") or _stage_for(job.status)

    return DownloadStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=effective_progress,
        message=effective_message,
        output_path=storage.to_public_path(job.output_path),
        updated_at=job.updated_at,
        stage=effective_stage,
        eta_seconds=_as_int(live.get("etaSeconds")),
        speed_bps=_as_float(live.get("speedBps")),
        downloaded_bytes=_as_int(live.get("downloadedBytes")),
        total_bytes=_as_int(live.get("totalBytes")),
        playlist_items=[
            _build_item_response(job.id, item)
            for item in playlist_items
        ],
    )


def _build_item_response(job_id: str, item: PlaylistItem) -> PlaylistItemResponse:
    live = (
        progress_store.read_item(job_id, item.position)
        if item.status not in ("completed", "failed")
        else {}
    )
    effective_progress = max(item.progress or 0, int(live.get("progress") or 0))

    return PlaylistItemResponse(
        id=item.id,
        title=item.title,
        position=item.position,
        status=item.status,
        progress=effective_progress,
        duration=item.duration,
        output_path=storage.to_public_path(item.output_path),
        stage=live.get("stage") or _stage_for(item.status),
        eta_seconds=_as_int(live.get("etaSeconds")),
        speed_bps=_as_float(live.get("speedBps")),
        downloaded_bytes=_as_int(live.get("downloadedBytes")),
        total_bytes=_as_int(live.get("totalBytes")),
    )


_CLEANUP_DELAY_SECONDS = 3600  # 1 hour — enough time for "Download again"


@router.get("/files/{filename}")
def download_completed_file(filename: str) -> FileResponse:
    if storage.mode == "s3":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct file streaming is unavailable when S3 storage is enabled.",
        )

    file_path = storage.resolve_local_file(filename)

    stem = file_path.stem
    suffix = file_path.suffix or ".mp4"
    friendly_name = f"video-{stem[:8]}{suffix}"

    # Schedule deletion after the grace period — runs in the background via
    # Celery so this endpoint returns immediately without any delay.
    cleanup_storage_file.apply_async(
        args=[str(file_path)],
        countdown=_CLEANUP_DELAY_SECONDS,
    )

    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=friendly_name,
        headers={"Content-Disposition": f'attachment; filename="{friendly_name}"'},
    )


@router.post("/batch", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
def create_batch_download(
    payload: CreateBatchDownloadRequest,
    db: Session = Depends(get_db)
):
    batch_id = str(uuid4())
    jobs = []
    
    for url in payload.urls:
        url_cleaned = url.strip()
        if not url_cleaned:
            continue
            
        job = DownloadJob(
            url=url_cleaned,
            batch_id=batch_id,
            format_id="bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" if not payload.audio_only else "bestaudio",
            audio_only=payload.audio_only,
            status="pending",
            progress=0,
            message="Queued for batch download",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        # Start download task
        task = process_single_video.delay(job.id)
        job.celery_task_id = task.id
        db.commit()
        
        jobs.append({
            "jobId": job.id,
            "status": job.status,
            "progress": job.progress,
            "message": job.message,
        })
        
    return {"batchId": batch_id, "jobs": jobs}


@router.post("/{job_id}/pause", status_code=status.HTTP_200_OK)
def pause_download(job_id: str, db: Session = Depends(get_db)):
    job = db.get(DownloadJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.status == "processing" and job.celery_task_id:
        # Revoke the celery task
        celery_app.control.revoke(job.celery_task_id, terminate=True)
        
    job.status = "paused"
    job.message = "Paused by user"
    db.commit()
    
    progress_store.publish_job(
        job_id=job.id,
        stage="paused",
        progress=job.progress,
        message=job.message,
    )
    return {"status": "paused"}


@router.post("/{job_id}/resume", status_code=status.HTTP_200_OK)
def resume_download(job_id: str, db: Session = Depends(get_db)):
    job = db.get(DownloadJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.status in ("paused", "failed", "pending"):
        job.status = "pending"
        job.message = "Resuming download"
        db.commit()
        
        task = process_single_video.delay(job.id)
        job.celery_task_id = task.id
        db.commit()
        
        progress_store.publish_job(
            job_id=job.id,
            stage="queued",
            progress=job.progress,
            message=job.message,
        )
        
    return {"status": "resumed"}


@router.post("/{job_id}/cancel", status_code=status.HTTP_200_OK)
def cancel_download(job_id: str, db: Session = Depends(get_db)):
    job = db.get(DownloadJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.status in ("processing", "pending") and job.celery_task_id:
        celery_app.control.revoke(job.celery_task_id, terminate=True)
        
    job.status = "failed"
    job.message = "Cancelled by user"
    db.commit()
    
    progress_store.publish_job(
        job_id=job.id,
        stage="failed",
        progress=job.progress,
        message=job.message,
    )
    return {"status": "cancelled"}
