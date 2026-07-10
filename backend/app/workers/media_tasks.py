import logging
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import httpx
from celery import shared_task
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.clip import Clip
from app.models.embedding import Embedding, Topic
from app.models.media_video import MediaVideo
from app.models.transcript import Transcript, TranscriptChunk, TranscriptSegment
from app.services.ai_worker_client import ai_worker_client
from app.services.media_processing import clip_service, ffmpeg_service, processing_job_service
from app.services.media_storage import clip_storage, temp_storage, video_storage
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
        video.status = "uploaded"
        db.commit()

        processing_job_service.update_progress(db, job_id, 100, "Download complete", "completed")
        process_video_pipeline.delay(video_id, None)
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


@celery_app.task(name="media.process_video_pipeline", bind=True, max_retries=2)
def process_video_pipeline(self, video_id: str, job_id: str | None) -> str:
    db = _db()
    try:
        if not job_id:
            job = processing_job_service.create(
                db, "full_pipeline", video_id=video_id, message="Pipeline started"
            )
            job_id = job.id

        video = db.get(MediaVideo, video_id)
        if not video:
            raise ValueError("Video not found")

        video.status = "processing"
        db.commit()

        # Step 1: Extract audio
        processing_job_service.update_progress(db, job_id, 10, "Extracting audio", "processing")
        video_path = clip_service.get_video_path(video)
        audio_path = Path(settings.local_storage_path) / settings.temp_storage_path / f"{video_id}.wav"
        ffmpeg_service.extract_audio(video_path, audio_path)

        # Step 2: Transcription via AI worker
        processing_job_service.update_progress(db, job_id, 30, "Transcribing", "processing")
        transcript_data = ai_worker_client.transcribe_sync(str(audio_path))

        transcript = Transcript(
            video_id=video_id,
            full_text=transcript_data.get("full_text", ""),
            language=transcript_data.get("language"),
            confidence=transcript_data.get("confidence"),
            status="completed",
            word_count=len(transcript_data.get("full_text", "").split()),
        )
        db.add(transcript)
        db.commit()
        db.refresh(transcript)

        segments = transcript_data.get("segments", [])
        for idx, seg in enumerate(segments):
            db.add(
                TranscriptSegment(
                    transcript_id=transcript.id,
                    video_id=video_id,
                    text=seg["text"],
                    start_time=seg["start"],
                    end_time=seg["end"],
                    confidence=seg.get("confidence"),
                    sequence_index=idx,
                )
            )
        db.commit()

        # Step 3: Chunk transcript
        processing_job_service.update_progress(db, job_id, 50, "Chunking transcript", "processing")
        chunks = _chunk_segments(segments)
        chunk_records = []
        for idx, chunk in enumerate(chunks):
            record = TranscriptChunk(
                video_id=video_id,
                transcript_id=transcript.id,
                text=chunk["text"],
                start_time=chunk["start"],
                end_time=chunk["end"],
                sequence_index=idx,
            )
            db.add(record)
            chunk_records.append(record)
        db.commit()
        for record in chunk_records:
            db.refresh(record)

        # Step 4: Generate embeddings
        processing_job_service.update_progress(db, job_id, 70, "Generating embeddings", "processing")
        chunk_payload = [{"id": c.id, "text": c.text} for c in chunk_records]
        embedding_result = ai_worker_client.generate_embeddings_sync(chunk_payload)
        embeddings_list = embedding_result.get("embeddings", [])

        for i, emb in enumerate(embeddings_list):
            if i < len(chunk_records):
                db.add(
                    Embedding(
                        chunk_id=chunk_records[i].id,
                        video_id=video_id,
                        embedding=emb,
                        model_name=embedding_result.get("model", "all-MiniLM-L6-v2"),
                    )
                )
        db.commit()

        # Step 5: Topic detection
        processing_job_service.update_progress(db, job_id, 85, "Detecting topics", "processing")
        topic_result = ai_worker_client.detect_topics_sync(
            segments, video.duration_seconds or 0
        )
        for topic in topic_result.get("topics", []):
            db.add(
                Topic(
                    video_id=video_id,
                    title=topic["title"],
                    summary=topic.get("summary"),
                    start_time=topic["start_time"],
                    end_time=topic["end_time"],
                    confidence=topic.get("confidence"),
                    key_decisions=topic.get("key_decisions"),
                    action_items=topic.get("action_items"),
                    risks=topic.get("risks"),
                    issues_raised=topic.get("issues_raised"),
                )
            )
        db.commit()

        video.status = "ready"
        db.commit()
        processing_job_service.update_progress(db, job_id, 100, "Processing complete", "completed")
        return video_id
    except Exception as exc:
        logger.exception("Pipeline failed: %s", exc)
        if job_id:
            processing_job_service.fail(db, job_id, str(exc))
        if video := db.get(MediaVideo, video_id):
            video.status = "failed"
            db.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()


@celery_app.task(name="media.generate_clip", bind=True, max_retries=2)
def generate_clip(self, clip_id: str, job_id: str) -> str:
    db = _db()
    try:
        clip = db.get(Clip, clip_id)
        if not clip:
            raise ValueError("Clip not found")

        video = db.get(MediaVideo, clip.video_id)
        if not video:
            raise ValueError("Video not found")

        processing_job_service.update_progress(db, job_id, 10, "Preparing clip", "processing")
        clip.status = "processing"
        db.commit()

        video_path = clip_service.get_video_path(video)
        output_key = f"{clip_id}.mp4"
        output_path = Path(settings.local_storage_path) / settings.clip_storage_path / output_key
        ffmpeg_service.generate_clip(
            video_path, output_path, clip.start_time, clip.end_time
        )

        clip_storage.save(output_key, str(output_path), "video/mp4")
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


def _chunk_segments(segments: list[dict], max_chars: int = 500, max_gap: float = 5.0) -> list[dict]:
    if not segments:
        return []
    chunks: list[dict] = []
    current_text = ""
    current_start = segments[0]["start"]
    current_end = segments[0]["end"]

    for seg in segments:
        gap = seg["start"] - current_end
        if len(current_text) + len(seg["text"]) > max_chars or gap > max_gap:
            if current_text.strip():
                chunks.append({"text": current_text.strip(), "start": current_start, "end": current_end})
            current_text = seg["text"]
            current_start = seg["start"]
            current_end = seg["end"]
        else:
            current_text += " " + seg["text"]
            current_end = seg["end"]

    if current_text.strip():
        chunks.append({"text": current_text.strip(), "start": current_start, "end": current_end})
    return chunks
