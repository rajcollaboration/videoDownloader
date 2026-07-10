from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "clipfetch",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # Enable chord callbacks on the Redis result backend.
    result_extended=True,
    result_expires=3600,
    # Acknowledge tasks only after they finish — avoids losing in-flight
    # downloads on a worker crash/restart.
    task_acks_late=True,
    # Each worker process grabs one task at a time; keeps a slow download
    # from blocking others in the same pool.
    worker_prefetch_multiplier=1,
)
