from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "clipfetch",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks", "app.workers.media_tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_extended=True,
    result_expires=3600,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "media.download_video_from_url": {"queue": "video-download"},
        "media.process_video_pipeline": {"queue": "transcription"},
        "media.generate_clip": {"queue": "clip-generation"},
        "media.generate_clips_batch": {"queue": "clip-generation"},
        "media.cleanup_temp_files": {"queue": "cleanup"},
        "app.workers.tasks.*": {"queue": "celery"},
    },
    task_default_queue="celery",
)
