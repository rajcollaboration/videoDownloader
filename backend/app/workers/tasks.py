from pathlib import Path
import re
from shutil import which
from typing import Any

from celery import chord
from sqlalchemy.orm import Session
from yt_dlp import YoutubeDL

from app.db.session import SessionLocal
from app.core.config import settings
from app.models.download import DownloadJob, PlaylistItem
from app.models.video import VideoRequest
from app.services import progress_store
from app.services.storage import StorageService
from app.services.ytdlp_options import cookie_options
from app.workers.celery_app import celery_app

storage = StorageService()


@celery_app.task(bind=True)
def process_download(self, job_id: str) -> None:
    """Entry point for a download job.

    For single videos we download inline on this worker. For playlists we
    fan out one Celery task per item so they run in parallel across the
    worker pool; a chord callback finalizes the job after all items finish.
    """
    db = SessionLocal()
    try:
        job = db.get(DownloadJob, job_id)
        if not job:
            return

        request = db.get(VideoRequest, job.request_id)
        if not request:
            job.status = "failed"
            job.message = "Original request no longer exists."
            db.commit()
            return

        playlist_items = (
            db.query(PlaylistItem).filter(PlaylistItem.job_id == job.id).order_by(PlaylistItem.position).all()
        )

        if playlist_items:
            job.status = "processing"
            job.progress = 5
            job.message = f"Queuing {len(playlist_items)} videos for parallel download"
            db.commit()
            progress_store.publish_job(
                job_id=job.id,
                stage="downloading",
                progress=5,
                message=job.message,
            )
            header = [process_playlist_item.s(job.id, item.id) for item in playlist_items]
            chord(header)(finalize_playlist.s(job.id))
            return

        # Single video path — do the work inline with retry semantics.
        process_single_video.delay(job.id)
    finally:
        db.close()


@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def process_single_video(self, job_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(DownloadJob, job_id)
        if not job:
            return

        job.status = "processing"
        job.progress = 5
        job.message = "Fetching video metadata"
        job.celery_task_id = self.request.id
        db.commit()
        
        progress_store.publish_job(
            job_id=job.id,
            stage="fetching",
            progress=5,
            message="Fetching video metadata",
        )

        request = db.get(VideoRequest, job.request_id) if job.request_id else None
        if not request and not job.url:
            job.status = "failed"
            job.message = "Original request no longer exists."
            db.commit()
            return

        source_url = request.url if request else job.url
        _process_single(job=job, source_url=source_url, db=db)

        progress_store.publish_job(
            job_id=job.id,
            stage="completed",
            progress=100,
            message=job.message,
            etaSeconds=0,
            speedBps=0,
        )
    except Exception as exc:
        job = db.get(DownloadJob, job_id)
        if job:
            job.status = "failed"
            job.progress = 100
            job.message = f"Failed: {exc}"
            job.error_detail = str(exc)
            db.commit()
            progress_store.publish_job(
                job_id=job.id,
                stage="failed",
                progress=100,
                message=str(exc),
            )
        raise
    finally:
        db.close()


@celery_app.task(bind=True)
def process_playlist_item(self, job_id: str, item_id: str) -> dict:
    """Download a single playlist item. Returns a status dict for the chord.

    Exceptions are caught and converted into a failed-status result so the
    chord callback always runs and the UI never stalls on a single bad item.
    """
    db = SessionLocal()
    try:
        item = db.get(PlaylistItem, item_id)
        job = db.get(DownloadJob, job_id)
        if not item or not job:
            return {"item_id": item_id, "status": "missing"}

        _ensure_ffmpeg_available()
        extension = "mp3" if job.audio_only else "mp4"

        item.status = "processing"
        item.progress = 10
        db.commit()
        progress_store.publish_item(
            job_id=job.id,
            position=item.position,
            stage="downloading",
            progress=10,
            message="Starting download",
        )

        item_output = storage.build_output_path(f"{job.id}-{item.position}", extension)
        Path(item_output).parent.mkdir(parents=True, exist_ok=True)
        template_path = str(Path(item_output).with_suffix(".%(ext)s"))

        hook = _make_progress_hook(job.id, position=item.position)

        try:
            with YoutubeDL(
                _base_ydl_opts(job.format_id, template_path, job.audio_only, hook)
            ) as ydl:
                ydl.download([item.source_url])
        except Exception as exc:
            if _is_download_empty_error(exc):
                fallback_format_id = _build_fallback_format_id(job.format_id)
                if fallback_format_id and fallback_format_id != job.format_id:
                    with YoutubeDL(
                        _base_ydl_opts(
                            fallback_format_id, template_path, job.audio_only, hook
                        )
                    ) as ydl:
                        ydl.download([item.source_url])
                else:
                    raise
            else:
                raise

        resolved_output = str(Path(item_output).with_suffix(f".{extension}"))
        final_path = storage.upload_file(resolved_output, Path(resolved_output).name)

        # Re-fetch to avoid stale row (other workers may have touched siblings).
        item = db.get(PlaylistItem, item_id)
        item.output_path = final_path
        item.status = "completed"
        item.progress = 100
        db.commit()

        progress_store.publish_item(
            job_id=job.id,
            position=item.position,
            stage="completed",
            progress=100,
            message="Completed",
            etaSeconds=0,
            speedBps=0,
        )

        # Nudge the aggregate job progress so the UI moves even before the
        # chord callback runs.
        _bump_job_aggregate_progress(db, job.id)

        return {"item_id": item_id, "status": "completed", "output_path": final_path}
    except Exception as exc:
        try:
            item = db.get(PlaylistItem, item_id)
            if item:
                item.status = "failed"
                item.progress = 100
                item.output_path = None
                db.commit()
                progress_store.publish_item(
                    job_id=job_id,
                    position=item.position,
                    stage="failed",
                    progress=100,
                    message=f"Failed: {exc}",
                )
                _bump_job_aggregate_progress(db, job_id)
        except Exception:
            pass
        return {"item_id": item_id, "status": "failed", "error": str(exc)}
    finally:
        db.close()


@celery_app.task(bind=True)
def finalize_playlist(self, results: list[dict], job_id: str) -> None:
    """Chord callback: set final job status once every item has been attempted."""
    db = SessionLocal()
    try:
        job = db.get(DownloadJob, job_id)
        if not job:
            return

        items = (
            db.query(PlaylistItem)
            .filter(PlaylistItem.job_id == job_id)
            .all()
        )
        total = len(items)
        succeeded = sum(1 for it in items if it.status == "completed")
        failed = sum(1 for it in items if it.status == "failed")

        job.status = "completed" if succeeded > 0 else "failed"
        job.progress = 100
        job.message = f"Playlist completed ({succeeded}/{total} succeeded, {failed} failed)"
        job.output_path = None
        db.commit()

        progress_store.publish_job(
            job_id=job.id,
            stage="completed" if succeeded > 0 else "failed",
            progress=100,
            message=job.message,
            etaSeconds=0,
            speedBps=0,
        )
    finally:
        db.close()


def _bump_job_aggregate_progress(db: Session, job_id: str) -> None:
    """Recompute the parent job's progress from per-item states so the UI
    keeps moving while the chord is still running."""
    try:
        job = db.get(DownloadJob, job_id)
        if not job:
            return
        items = db.query(PlaylistItem).filter(PlaylistItem.job_id == job_id).all()
        if not items:
            return
        total = len(items)
        done = sum(1 for it in items if it.status in ("completed", "failed"))
        in_progress_partial = sum(
            (it.progress or 0) for it in items if it.status == "processing"
        )
        aggregate = int((done * 100 + in_progress_partial) / total)
        aggregate = max(5, min(99, aggregate))
        job.progress = max(job.progress or 0, aggregate)
        job.message = f"Downloading in parallel — {done}/{total} finished"
        db.commit()
        progress_store.publish_job(
            job_id=job_id,
            stage="downloading",
            progress=job.progress,
            message=job.message,
        )
    except Exception:
        db.rollback()


def _make_progress_hook(job_id: str, position: int | None = None):
    """Return a yt-dlp progress_hook that streams state to Redis.

    yt-dlp calls this very frequently (~every chunk). We therefore publish
    only to Redis and leave Postgres alone until the task completes or hits
    a stage boundary.
    """

    def hook(d: dict[str, Any]) -> None:
        status = d.get("status")
        if status == "downloading":
            # yt-dlp returns a mix of ints and floats (total_bytes_estimate
            # in particular is often float). Coerce numeric fields to the
            # schema-expected types at the boundary.
            downloaded = int(d.get("downloaded_bytes") or 0)
            total_raw = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            total = int(total_raw) if total_raw else 0
            percent = int((downloaded / total) * 100) if total else 0
            scaled = max(10, min(95, 10 + int(percent * 0.85)))
            fields = {
                "stage": "downloading",
                "progress": scaled,
                "message": "Downloading media",
                "downloadedBytes": downloaded,
                "totalBytes": total,
                "speedBps": float(d.get("speed") or 0),
                "etaSeconds": int(d.get("eta") or 0),
            }
        elif status == "finished":
            fields = {
                "stage": "processing",
                "progress": 96,
                "message": "Processing file",
                "etaSeconds": 0,
                "speedBps": 0,
            }
        elif status == "error":
            fields = {"stage": "failed", "message": "Downloader error"}
        else:
            return

        if position is not None:
            progress_store.publish_item(job_id, position, **fields)
        else:
            progress_store.publish_job(job_id, **fields)

    return hook


def _base_ydl_opts(
    format_id: str,
    output_template: str,
    audio_only: bool,
    progress_hook,
) -> dict:
    options = {
        "format": format_id,
        "outtmpl": output_template,
        "retries": 10,
        "continuedl": True,
        "nopart": False,
        "concurrent_fragment_downloads": max(1, int(settings.ytdlp_concurrent_fragments)),
        "fragment_retries": 10,
        "file_access_retries": 10,
        "socket_timeout": 30,
        # Use yt-dlp's native HLS handling when possible.
        # Some environments fail with ffmpeg-based HLS downloading (ffmpeg exit code 8).
        "hls_prefer_native": True,
        # For HLS downloads: mpegts can reduce corruption/empty-output issues.
        "hls_use_mpegts": True,
        # Be explicit: skip missing/unavailable fragments instead of aborting.
        "skip_unavailable_fragments": True,
        # Validate selected formats are actually downloadable.
        "check_formats": "selected",
        "progress_hooks": [progress_hook],
        "noprogress": True,  # suppress stdout spam; we stream via hook
        "quiet": True,
        # Always produce an mp4 so the file name + extension we reserve on
        # disk matches what yt-dlp writes (the downstream code expects .mp4).
        "merge_output_format": "mp4" if not audio_only else None,
        # Work around YouTube's SSAP experiment — see video_resolver.py.
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios", "web_safari", "web"],
            },
        },
        **cookie_options(),
    }
    if options.get("merge_output_format") is None:
        options.pop("merge_output_format", None)

    if settings.ytdlp_http_chunk_size:
        # Enables ranged requests for some servers/CDNs (can improve throughput).
        options["http_chunk_size"] = int(settings.ytdlp_http_chunk_size)

    if settings.ytdlp_external_downloader:
        options["external_downloader"] = settings.ytdlp_external_downloader
        if settings.ytdlp_external_downloader_args:
            # yt-dlp accepts args as a list; keep env var ergonomics as a string.
            options["external_downloader_args"] = settings.ytdlp_external_downloader_args.split()

    if audio_only:
        options.update(
            {
                "format": "bestaudio/best",
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }
                ],
            }
        )
    return options


def _ensure_ffmpeg_available() -> None:
    if which("ffmpeg"):
        return
    raise RuntimeError(
        "ffmpeg is required for YouTube downloads in this environment. "
        "Install ffmpeg or run the app via Docker where ffmpeg is preinstalled."
    )


def _extract_max_height_from_format_id(format_id: str) -> int | None:
    """
    Extract `max_height` from selectors like:
      "...[height<=360]..."
    """
    match = re.search(r"height<=\s*(\d+)", format_id.replace(" ", ""))
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def _is_download_empty_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "downloaded file is empty" in msg


def _build_fallback_format_id(original_format_id: str) -> str | None:
    max_h = _extract_max_height_from_format_id(original_format_id)
    if max_h is None:
        return None
    # Prefer a single combined stream at/below the requested height.
    # This avoids the bv+ba merge path for some videos.
    return f"b[height<={max_h}]/b"


@celery_app.task(ignore_result=True)
def cleanup_storage_file(file_path: str) -> None:
    """Delete a locally-stored download file after it has been delivered.

    Runs via Celery countdown so the response is never delayed and the file
    remains available for re-download during the grace period.
    """
    try:
        path = Path(file_path)
        if path.exists() and path.is_file():
            path.unlink()
    except Exception:
        pass


def _process_single(job: DownloadJob, source_url: str, db: Session) -> None:
    _ensure_ffmpeg_available()
    extension = "mp3" if job.audio_only else "mp4"
    output_path = storage.build_output_path(job.id, extension)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    template_path = str(Path(output_path).with_suffix(".%(ext)s"))

    hook = _make_progress_hook(job.id)
    job.progress = 10
    job.message = "Downloading media"
    db.commit()
    progress_store.publish_job(
        job_id=job.id,
        stage="downloading",
        progress=10,
        message="Downloading media",
    )

    title = "Direct Download"
    try:
        with YoutubeDL({"quiet": True, **cookie_options()}) as ydl:
            info = ydl.extract_info(source_url, download=False)
            title = info.get("title", "Direct Download")
    except Exception:
        pass

    try:
        with YoutubeDL(
            _base_ydl_opts(job.format_id, template_path, job.audio_only, hook)
        ) as ydl:
            ydl.download([source_url])
    except Exception as exc:
        if _is_download_empty_error(exc):
            fallback_format_id = _build_fallback_format_id(job.format_id)
            if fallback_format_id and fallback_format_id != job.format_id:
                with YoutubeDL(
                    _base_ydl_opts(
                        fallback_format_id, template_path, job.audio_only, hook
                    )
                ) as ydl:
                    ydl.download([source_url])
                resolved_output = str(Path(output_path).with_suffix(f".{extension}"))
                final_path = storage.upload_file(resolved_output, Path(resolved_output).name)
                job.status = "completed"
                job.progress = 100
                job.message = "Download completed"
                job.output_path = final_path
                db.commit()
                _register_media_video(db, job, resolved_output, title)
                return
        raise

    resolved_output = str(Path(output_path).with_suffix(f".{extension}"))
    final_path = storage.upload_file(resolved_output, Path(resolved_output).name)
    job.status = "completed"
    job.progress = 100
    job.message = "Download completed"
    job.output_path = final_path
    db.commit()
    _register_media_video(db, job, resolved_output, title)


def _register_media_video(db: Session, job: DownloadJob, local_path_str: str, title: str) -> None:
    from app.models.media_video import MediaVideo
    from app.services.video_validation import video_validation
    from app.services.media_storage import video_storage
    from uuid import uuid4
    import logging
    
    try:
        local_path = Path(local_path_str)
        probe = video_validation.probe_video(local_path)
        storage_key = f"{uuid4()}.mp4"
        
        video_storage.save(storage_key, str(local_path), "video/mp4")
        
        video = MediaVideo(
            title=title,
            source_type="download",
            download_job_id=job.id,
            file_path=str(local_path),
            storage_key=storage_key,
            mime_type="video/mp4",
            file_size=local_path.stat().st_size if local_path.is_file() else None,
            duration_seconds=probe.get("duration_seconds"),
            width=probe.get("width"),
            height=probe.get("height"),
            fps=probe.get("fps"),
            status="ready",
        )
        db.add(video)
        db.commit()
    except Exception as exc:
        logger = logging.getLogger(__name__)
        logger.exception("Failed to auto register MediaVideo for job %s: %s", job.id, exc)
