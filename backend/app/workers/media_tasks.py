import logging
from pathlib import Path
from uuid import uuid4
from celery import shared_task
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.clip import Clip
from app.models.media_video import MediaVideo
from app.models.processing import ProcessingJob
from app.services.media_processing import (
    clip_service,
    ffmpeg_service,
    processing_job_service,
)
from app.services.media_storage import clip_storage, video_storage
from app.services.video_validation import video_validation
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _db() -> Session:
    return SessionLocal()


@celery_app.task(name="media.download_video_from_url", bind=True, max_retries=3)
def download_video_from_url(self, video_id: str, job_id: str, url: str) -> str:
    db = _db()
    try:
        processing_job_service.update_progress(db, job_id, 10, "Downloading video", "processing")
        video = db.get(MediaVideo, video_id)
        if not video:
            raise ValueError("Video not found")

        dest = Path(settings.local_storage_path) / settings.temp_storage_path / f"{video_id}.mp4"
        dest.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            "yt-dlp",
            "-f",
            "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format",
            "mp4",
            "-o",
            str(dest),
            url,
        ]
        import subprocess
        subprocess.run(cmd, check=True, capture_output=True, timeout=3600)

        probe = video_validation.probe_video(dest)
        storage_key = f"{uuid4()}.mp4"
        video_storage.save(storage_key, str(dest), "video/mp4")

        video.storage_key = storage_key
        video.file_path = str(dest)
        video.file_size = dest.stat().st_size
        video.duration_seconds = probe.get("duration_seconds")
        video.width = probe.get("width")
        video.height = probe.get("height")
        video.fps = probe.get("fps")
        video.status = "ready"  # Directly set to ready since transcription is removed
        db.commit()

        processing_job_service.update_progress(db, job_id, 100, "Download complete", "completed")
        return video_id
    except Exception as exc:
        logger.exception("URL download failed: %s", exc)
        processing_job_service.fail(db, job_id, str(exc))
        if video := db.get(MediaVideo, video_id):
            video.status = "failed"
            db.commit()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(name="media.generate_clip", bind=True, max_retries=2)
def generate_clip(self, clip_id: str, job_id: str) -> str:
    db = _db()
    try:
        clip = db.get(Clip, clip_id)
        if not clip:
            raise ValueError("Clip not found")
        job = db.get(ProcessingJob, job_id)
        metadata = job.metadata_json or {}
        format = metadata.get("format", "mp4").lower()
        audio_only = metadata.get("audio_only", False)
        
        video = db.get(MediaVideo, clip.video_id)
        if not video:
            raise ValueError("Media not found")

        processing_job_service.update_progress(db, job_id, 10, "Preparing clip", "processing")
        clip.status = "processing"
        db.commit()

        video_path = clip_service.get_video_path(video)
        output_key = f"{clip_id}.{format}"
        output_path = Path(settings.local_storage_path) / settings.clip_storage_path / output_key
        
        processing_job_service.update_progress(db, job_id, 40, "Clipping via FFmpeg", "processing")
        ffmpeg_service.generate_clip(
            video_path, output_path, clip.start_time, clip.end_time, format=format, audio_only=audio_only
        )

        processing_job_service.update_progress(db, job_id, 80, "Saving output to storage", "processing")
        mime_map = {
            "mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm", "mkv": "video/x-matroska", "avi": "video/x-msvideo",
            "mp3": "audio/mpeg", "aac": "audio/aac", "wav": "audio/wav", "flac": "audio/flac", "ogg": "audio/ogg"
        }
        mime = mime_map.get(format, "video/mp4")
        clip_storage.save(output_key, str(output_path), mime)
        
        clip.file_path = str(output_path)
        clip.storage_key = output_key
        clip.file_size = output_path.stat().st_size
        clip.status = "completed"
        clip.progress = 100
        db.commit()

        processing_job_service.update_progress(db, job_id, 100, "Clip ready", "completed")
        return clip_id
    except Exception as exc:
        logger.exception("Clip generation failed: %s", exc)
        processing_job_service.fail(db, job_id, str(exc))
        if clip := db.get(Clip, clip_id):
            clip.status = "failed"
            clip.error_detail = str(exc)[:500]
            db.commit()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(name="media.apply_watermark", bind=True, max_retries=2)
def apply_watermark(self, clip_id: str, job_id: str) -> str:
    db = _db()
    try:
        clip = db.get(Clip, clip_id)
        if not clip:
            raise ValueError("Output record not found")
        job = db.get(ProcessingJob, job_id)
        metadata = job.metadata_json or {}
        watermarks = metadata.get("watermarks", [])
        
        video = db.get(MediaVideo, clip.video_id)
        if not video:
            raise ValueError("Media not found")

        processing_job_service.update_progress(db, job_id, 10, "Preparing watermark", "processing")
        clip.status = "processing"
        db.commit()

        parent_clip_id = metadata.get("parent_clip_id")
        if parent_clip_id:
            parent_clip = db.get(Clip, parent_clip_id)
            if not parent_clip:
                raise ValueError("Parent clip not found")
            media_path = Path(parent_clip.file_path)
            is_image = False
            duration = parent_clip.duration_seconds or (parent_clip.end_time - parent_clip.start_time)
        else:
            media_path = clip_service.get_video_path(video)
            is_image = video.mime_type and video.mime_type.startswith("image/")
            duration = video.duration_seconds or 0.0

        ext = Path(media_path).suffix.lstrip(".").lower()
        output_key = f"{clip_id}.{ext}"
        output_path = Path(settings.local_storage_path) / settings.clip_storage_path / output_key
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        context = {
            "file_name": video.title,
            "video_duration": str(duration),
        }
        if job.user_id:
            from app.models.user import User
            user = db.get(User, job.user_id)
            if user:
                context["username"] = user.email.split("@")[0]
                context["email"] = user.email

        if is_image:
            processing_job_service.update_progress(db, job_id, 40, "Watermarking image", "processing")
            ffmpeg_service.watermark_image(media_path, output_path, watermarks, context)
            mime = video.mime_type or "image/png"
        else:
            processing_job_service.update_progress(db, job_id, 40, "Watermarking video via FFmpeg", "processing")
            temp_files = ffmpeg_service.watermark_video(
                media_path, output_path, watermarks,
                video_width=video.width or 1920,
                video_height=video.height or 1080,
                video_duration=duration,
                context=context
            )
            for tf in temp_files:
                try:
                    tf.unlink()
                except Exception:
                    pass
            mime = video.mime_type or "video/mp4"

        processing_job_service.update_progress(db, job_id, 80, "Saving output to storage", "processing")
        clip_storage.save(output_key, str(output_path), mime)
        
        clip.file_path = str(output_path)
        clip.storage_key = output_key
        clip.file_size = output_path.stat().st_size
        clip.status = "completed"
        clip.progress = 100
        db.commit()

        processing_job_service.update_progress(db, job_id, 100, "Watermarked media ready", "completed")
        return clip_id
    except Exception as exc:
        logger.exception("Watermarking failed: %s", exc)
        processing_job_service.fail(db, job_id, str(exc))
        if clip := db.get(Clip, clip_id):
            clip.status = "failed"
            clip.error_detail = str(exc)[:500]
            db.commit()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(name="media.convert_format", bind=True, max_retries=2)
def convert_format(self, clip_id: str, job_id: str) -> str:
    db = _db()
    try:
        clip = db.get(Clip, clip_id)
        if not clip:
            raise ValueError("Output record not found")
        job = db.get(ProcessingJob, job_id)
        metadata = job.metadata_json or {}
        
        video = db.get(MediaVideo, clip.video_id)
        if not video:
            raise ValueError("Media not found")

        processing_job_service.update_progress(db, job_id, 10, "Preparing conversion", "processing")
        clip.status = "processing"
        db.commit()

        media_path = clip_service.get_video_path(video)
        format = metadata.get("format", "mp4").lower()
        output_key = f"{clip_id}.{format}"
        output_path = Path(settings.local_storage_path) / settings.clip_storage_path / output_key
        
        processing_job_service.update_progress(db, job_id, 40, "Converting video via FFmpeg", "processing")
        ffmpeg_service.convert_video(
            input_path=media_path,
            output_path=output_path,
            format=format,
            quality=metadata.get("quality_preset", "medium"),
            resolution=metadata.get("resolution"),
            fps=metadata.get("fps"),
            bitrate=metadata.get("bitrate"),
            codec=metadata.get("codec")
        )

        processing_job_service.update_progress(db, job_id, 80, "Saving output to storage", "processing")
        mime_map = {
            "mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm", "mkv": "video/x-matroska", "avi": "video/x-msvideo",
            "flv": "video/x-flv", "wmv": "video/x-ms-wmv"
        }
        mime = mime_map.get(format, "video/mp4")
        clip_storage.save(output_key, str(output_path), mime)
        
        clip.file_path = str(output_path)
        clip.storage_key = output_key
        clip.file_size = output_path.stat().st_size
        clip.status = "completed"
        clip.progress = 100
        db.commit()

        processing_job_service.update_progress(db, job_id, 100, "Converted media ready", "completed")
        return clip_id
    except Exception as exc:
        logger.exception("Conversion failed: %s", exc)
        processing_job_service.fail(db, job_id, str(exc))
        if clip := db.get(Clip, clip_id):
            clip.status = "failed"
            clip.error_detail = str(exc)[:500]
            db.commit()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(name="media.extract_audio", bind=True, max_retries=2)
def extract_audio(self, clip_id: str, job_id: str) -> str:
    db = _db()
    try:
        clip = db.get(Clip, clip_id)
        if not clip:
            raise ValueError("Output record not found")
        job = db.get(ProcessingJob, job_id)
        metadata = job.metadata_json or {}
        
        video = db.get(MediaVideo, clip.video_id)
        if not video:
            raise ValueError("Media not found")

        processing_job_service.update_progress(db, job_id, 10, "Preparing extraction", "processing")
        clip.status = "processing"
        db.commit()

        media_path = clip_service.get_video_path(video)
        format = metadata.get("format", "mp3").lower()
        output_key = f"{clip_id}.{format}"
        output_path = Path(settings.local_storage_path) / settings.clip_storage_path / output_key
        
        processing_job_service.update_progress(db, job_id, 40, "Extracting audio via FFmpeg", "processing")
        ffmpeg_service.extract_audio(
            video_path=media_path,
            output_path=output_path,
            format=format,
            bitrate=metadata.get("bitrate"),
            preserve_metadata=metadata.get("preserve_metadata", True)
        )

        processing_job_service.update_progress(db, job_id, 80, "Saving output to storage", "processing")
        mime_map = {"mp3": "audio/mpeg", "aac": "audio/aac", "wav": "audio/wav", "flac": "audio/flac", "ogg": "audio/ogg"}
        mime = mime_map.get(format, "audio/mpeg")
        clip_storage.save(output_key, str(output_path), mime)
        
        clip.file_path = str(output_path)
        clip.storage_key = output_key
        clip.file_size = output_path.stat().st_size
        clip.status = "completed"
        clip.progress = 100
        db.commit()

        processing_job_service.update_progress(db, job_id, 100, "Audio ready", "completed")
        return clip_id
    except Exception as exc:
        logger.exception("Audio extraction failed: %s", exc)
        processing_job_service.fail(db, job_id, str(exc))
        if clip := db.get(Clip, clip_id):
            clip.status = "failed"
            clip.error_detail = str(exc)[:500]
            db.commit()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(name="media.generate_clips_batch")
def generate_clips_batch(clip_ids: list[str], job_id: str) -> list[str]:
    for i, clip_id in enumerate(clip_ids):
        generate_clip.delay(clip_id, job_id)
    return clip_ids


@celery_app.task(name="media.cleanup_temp_files")
def cleanup_temp_files(video_id: str) -> None:
    temp_dir = Path(settings.local_storage_path) / settings.temp_storage_path
    for pattern in [f"{video_id}.wav", f"{video_id}.mp4"]:
        path = temp_dir / pattern
        if path.is_file():
            path.unlink()
