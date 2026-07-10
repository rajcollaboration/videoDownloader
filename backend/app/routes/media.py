import math
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_current_user_optional
from app.db.session import get_db
from app.models.clip import Clip
from app.models.media_video import MediaVideo
from app.models.processing import ProcessingJob
from app.models.user import User
from app.schemas.media import (
    ClipBatchCreateRequest,
    ClipCreateRequest,
    ClipResponse,
    MediaVideoListResponse,
    MediaVideoResponse,
    ProcessingJobResponse,
    VideoDetailResponse,
    VideoFromDownloadRequest,
    VideoFromUrlRequest,
    WatermarkRequest,
    BatchWatermarkRequest,
    ConvertRequest,
    ExtractAudioRequest,
)
from app.services.media_processing import clip_service, processing_job_service
from app.services.media_storage import clip_storage, video_storage
from app.services.media_video_service import media_video_service
from app.services.video_validation import video_validation
from app.workers.media_tasks import (
    generate_clip,
    generate_clips_batch,
    apply_watermark,
    convert_format,
    extract_audio,
)

router = APIRouter()


def _video_response(video: MediaVideo) -> MediaVideoResponse:
    playback = None
    if video.storage_key:
        playback = f"/api/v1/media/files/{video.storage_key}"
    elif video.file_path:
        playback = f"/api/v1/media/files/{Path(video.file_path).name}"
    return MediaVideoResponse(
        id=video.id,
        title=video.title,
        description=video.description,
        source_type=video.source_type,
        source_url=video.source_url,
        status=video.status,
        duration_seconds=video.duration_seconds,
        file_size=video.file_size,
        width=video.width,
        height=video.height,
        thumbnail_path=video.thumbnail_path,
        playback_url=playback,
        created_at=video.created_at,
        updated_at=video.updated_at,
    )


def _clip_response(clip: Clip) -> ClipResponse:
    download_url = None
    if clip.status == "completed":
        if clip.storage_key:
            download_url = f"/api/v1/media/clips/files/{clip.storage_key}"
        elif clip.file_path:
            download_url = f"/api/v1/media/clips/files/{Path(clip.file_path).name}"
    return ClipResponse(
        id=clip.id,
        video_id=clip.video_id,
        title=clip.title,
        start_time=clip.start_time,
        end_time=clip.end_time,
        duration_seconds=clip.duration_seconds,
        source=clip.source,
        search_query=clip.search_query,
        status=clip.status,
        progress=clip.progress,
        download_url=download_url,
        created_at=clip.created_at,
    )


@router.post("/upload", response_model=MediaVideoResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str | None = Form(None),
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    temp_path = Path(settings.local_storage_path) / settings.temp_storage_path / f"{uuid4()}{Path(file.filename or 'video.mp4').suffix}"
    size, mime = await video_validation.save_upload(file, temp_path)
    video = media_video_service.create_from_upload(
        db,
        title=title,
        local_path=temp_path,
        mime_type=mime,
        file_size=size,
        user_id=user.id if user else None,
        description=description,
    )
    return _video_response(video)


@router.post("/from-download", response_model=MediaVideoResponse, status_code=status.HTTP_201_CREATED)
def create_from_download(
    payload: VideoFromDownloadRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    try:
        video = media_video_service.create_from_download_job(
            db, payload.download_job_id, user.id if user else None
        )
        if payload.title:
            video.title = payload.title
            db.commit()
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _video_response(video)


@router.post("/from-url", response_model=MediaVideoResponse, status_code=status.HTTP_201_CREATED)
def create_from_url(
    payload: VideoFromUrlRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    video, _ = media_video_service.create_from_url(
        db, payload.url, payload.title, user.id if user else None
    )
    return _video_response(video)


@router.get("/", response_model=MediaVideoListResponse)
def list_videos(
    db: Annotated[Session, Depends(get_db)],
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    items, total = media_video_service.list_videos(
        db, user_id=user.id if user else None, page=page, page_size=page_size, status=status_filter
    )
    return MediaVideoListResponse(
        videos=[_video_response(v) for v in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/{video_id}", response_model=VideoDetailResponse)
def get_video(
    video_id: str,
    db: Annotated[Session, Depends(get_db)],
):
    video = db.get(MediaVideo, video_id)
    if not video or video.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    clips = db.query(Clip).filter(Clip.video_id == video_id, Clip.deleted_at.is_(None)).all()
    jobs = (
        db.query(ProcessingJob)
        .filter(ProcessingJob.video_id == video_id)
        .order_by(ProcessingJob.created_at.desc())
        .limit(10)
        .all()
    )

    base = _video_response(video)
    return VideoDetailResponse(
        **base.model_dump(),
        clips=[_clip_response(c) for c in clips],
        jobs=[ProcessingJobResponse.model_validate(j) for j in jobs],
    )


@router.post("/{video_id}/clips", response_model=ClipResponse, status_code=status.HTTP_201_CREATED)
def create_clip(
    video_id: str,
    payload: ClipCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    video = db.get(MediaVideo, video_id)
    if not video or video.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    try:
        clip = clip_service.create_clip_record(
            db,
            video_id=video_id,
            title=payload.title,
            start_time=payload.start_time,
            end_time=payload.end_time,
            user_id=user.id if user else None,
            source=payload.source,
            search_query=payload.search_query,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    job = processing_job_service.create(
        db, "clip_generation", video_id=video_id, clip_id=clip.id, user_id=user.id if user else None
    )
    task = generate_clip.delay(clip.id, job.id)
    job.celery_task_id = task.id
    db.commit()
    return _clip_response(clip)


@router.post("/{video_id}/clips/batch", response_model=list[ClipResponse])
def create_clips_batch(
    video_id: str,
    payload: ClipBatchCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    video = db.get(MediaVideo, video_id)
    if not video or video.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    clips = []
    clip_ids = []
    for item in payload.clips:
        clip = clip_service.create_clip_record(
            db,
            video_id=video_id,
            title=item.title,
            start_time=item.start_time,
            end_time=item.end_time,
            user_id=user.id if user else None,
            source=item.source,
            search_query=item.search_query,
        )
        clips.append(clip)
        clip_ids.append(clip.id)

    job = processing_job_service.create(
        db, "clip_generation_batch", video_id=video_id, user_id=user.id if user else None
    )
    generate_clips_batch.delay(clip_ids, job.id)
    return [_clip_response(c) for c in clips]


@router.get("/{video_id}/clips", response_model=list[ClipResponse])
def list_clips(video_id: str, db: Annotated[Session, Depends(get_db)]):
    clips = (
        db.query(Clip)
        .filter(Clip.video_id == video_id, Clip.deleted_at.is_(None))
        .order_by(Clip.created_at.desc())
        .all()
    )
    return [_clip_response(c) for c in clips]


@router.get("/files/{filename}")
def serve_media_file(filename: str):
    import mimetypes
    try:
        path = video_storage.get_local_path(filename)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc
    mime, _ = mimetypes.guess_type(path.name)
    return FileResponse(path, media_type=mime or "application/octet-stream")


@router.get("/clips/files/{filename}")
def serve_clip_file(filename: str):
    import mimetypes
    try:
        path = clip_storage.get_local_path(filename)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc
    mime, _ = mimetypes.guess_type(path.name)
    return FileResponse(path, media_type=mime or "application/octet-stream", filename=filename)


@router.post("/watermark/logo", status_code=status.HTTP_201_CREATED)
async def upload_logo(
    file: UploadFile = File(...),
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    temp_dir = Path(settings.local_storage_path) / settings.temp_storage_path
    temp_dir.mkdir(parents=True, exist_ok=True)
    logo_path = temp_dir / f"logo_{uuid4()}{Path(file.filename or 'logo.png').suffix}"
    
    with logo_path.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            out.write(chunk)
            
    return {"logo_path": str(logo_path)}


@router.post("/{video_id}/watermark", response_model=ClipResponse, status_code=status.HTTP_201_CREATED)
def watermark_media(
    video_id: str,
    payload: WatermarkRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    video = db.get(MediaVideo, video_id)
    if not video or video.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
        
    try:
        clip = clip_service.create_clip_record(
            db,
            video_id=video_id,
            title=payload.title,
            start_time=0.0,
            end_time=video.duration_seconds or 0.0,
            user_id=user.id if user else None,
            source="watermark",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    watermarks_data = [w.model_dump() for w in payload.watermarks]
    
    job = processing_job_service.create(
        db, "watermarking", video_id=video_id, clip_id=clip.id, user_id=user.id if user else None,
        metadata={"watermarks": watermarks_data}
    )
    
    task = apply_watermark.delay(clip.id, job.id)
    job.celery_task_id = task.id
    db.commit()
    return _clip_response(clip)


@router.post("/clips/{clip_id}/watermark", response_model=ClipResponse, status_code=status.HTTP_201_CREATED)
def watermark_clip(
    clip_id: str,
    payload: WatermarkRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    parent_clip = db.get(Clip, clip_id)
    if not parent_clip or parent_clip.deleted_at or parent_clip.status != "completed":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found or not ready")
        
    try:
        # Duration of output is same as parent clip
        duration = parent_clip.duration_seconds
        clip = clip_service.create_clip_record(
            db,
            video_id=parent_clip.video_id,
            title=payload.title,
            start_time=parent_clip.start_time,
            end_time=parent_clip.end_time,
            user_id=user.id if user else None,
            source="watermark",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    watermarks_data = [w.model_dump() for w in payload.watermarks]
    
    job = processing_job_service.create(
        db, "watermarking", video_id=parent_clip.video_id, clip_id=clip.id, user_id=user.id if user else None,
        metadata={"watermarks": watermarks_data, "parent_clip_id": parent_clip.id}
    )
    
    task = apply_watermark.delay(clip.id, job.id)
    job.celery_task_id = task.id
    db.commit()
    return _clip_response(clip)


@router.post("/watermark/batch", response_model=list[ClipResponse], status_code=status.HTTP_201_CREATED)
def watermark_media_batch(
    payload: BatchWatermarkRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    clips = []
    watermarks_data = [w.model_dump() for w in payload.watermarks]
    
    for video_id in payload.video_ids:
        video = db.get(MediaVideo, video_id)
        if not video or video.deleted_at:
            continue
            
        try:
            clip = clip_service.create_clip_record(
                db,
                video_id=video_id,
                title=f"Watermarked: {video.title}",
                start_time=0.0,
                end_time=video.duration_seconds or 0.0,
                user_id=user.id if user else None,
                source="watermark",
            )
            clips.append(clip)
            
            job = processing_job_service.create(
                db, "watermarking", video_id=video_id, clip_id=clip.id, user_id=user.id if user else None,
                metadata={"watermarks": watermarks_data}
            )
            
            task = apply_watermark.delay(clip.id, job.id)
            job.celery_task_id = task.id
            db.commit()
        except Exception:
            pass
            
    return [_clip_response(c) for c in clips]


@router.post("/{video_id}/convert", response_model=ClipResponse, status_code=status.HTTP_201_CREATED)
def convert_media(
    video_id: str,
    payload: ConvertRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    video = db.get(MediaVideo, video_id)
    if not video or video.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
        
    try:
        clip = clip_service.create_clip_record(
            db,
            video_id=video_id,
            title=payload.title,
            start_time=0.0,
            end_time=video.duration_seconds or 0.0,
            user_id=user.id if user else None,
            source="conversion",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    job = processing_job_service.create(
        db, "conversion", video_id=video_id, clip_id=clip.id, user_id=user.id if user else None,
        metadata=payload.model_dump()
    )
    
    task = convert_format.delay(clip.id, job.id)
    job.celery_task_id = task.id
    db.commit()
    return _clip_response(clip)


@router.post("/{video_id}/extract-audio", response_model=ClipResponse, status_code=status.HTTP_201_CREATED)
def extract_media_audio(
    video_id: str,
    payload: ExtractAudioRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
):
    video = db.get(MediaVideo, video_id)
    if not video or video.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
        
    try:
        clip = clip_service.create_clip_record(
            db,
            video_id=video_id,
            title=payload.title,
            start_time=0.0,
            end_time=video.duration_seconds or 0.0,
            user_id=user.id if user else None,
            source="audio_extraction",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    job = processing_job_service.create(
        db, "audio_extraction", video_id=video_id, clip_id=clip.id, user_id=user.id if user else None,
        metadata=payload.model_dump()
    )
    
    task = extract_audio.delay(clip.id, job.id)
    job.celery_task_id = task.id
    db.commit()
    return _clip_response(clip)


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    video_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    media_video_service.soft_delete(db, video_id)
