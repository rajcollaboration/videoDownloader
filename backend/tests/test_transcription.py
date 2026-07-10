"""Tests for transcription feature: API routes, pipeline task, and validation."""
import io
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.models.media_video import MediaVideo
from app.models.transcript import Transcript, TranscriptChunk, TranscriptSegment


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_video(db_session, **kwargs) -> MediaVideo:
    """Create and persist a minimal MediaVideo for testing."""
    video = MediaVideo(
        title=kwargs.get("title", "Test Video"),
        source_type=kwargs.get("source_type", "upload"),
        status=kwargs.get("status", "ready"),
        file_size=kwargs.get("file_size", 1024),
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)
    return video


def _make_transcript(db_session, video_id: str, **kwargs) -> Transcript:
    transcript = Transcript(
        video_id=video_id,
        full_text=kwargs.get("full_text", "Hello world this is a test."),
        language=kwargs.get("language", "en"),
        confidence=kwargs.get("confidence", -0.25),
        status=kwargs.get("status", "completed"),
        word_count=kwargs.get("word_count", 6),
    )
    db_session.add(transcript)
    db_session.commit()
    db_session.refresh(transcript)
    return transcript


def _make_segment(db_session, transcript_id: str, video_id: str, idx: int = 0) -> TranscriptSegment:
    seg = TranscriptSegment(
        transcript_id=transcript_id,
        video_id=video_id,
        text=f"Segment {idx}",
        start_time=float(idx * 5),
        end_time=float(idx * 5 + 4),
        confidence=-0.2,
        sequence_index=idx,
    )
    db_session.add(seg)
    db_session.commit()
    db_session.refresh(seg)
    return seg


# ===========================================================================
# 1. GET /{video_id}/transcript  – success path
# ===========================================================================

class TestGetTranscriptRoute:
    def test_returns_transcript_with_segments(self, client, db_session):
        video = _make_video(db_session)
        transcript = _make_transcript(db_session, video.id)
        _make_segment(db_session, transcript.id, video.id, idx=0)
        _make_segment(db_session, transcript.id, video.id, idx=1)

        resp = client.get(f"/v1/media/{video.id}/transcript")

        assert resp.status_code == 200
        data = resp.json()
        assert data["video_id"] == video.id
        assert data["full_text"] == "Hello world this is a test."
        assert data["language"] == "en"
        assert data["status"] == "completed"
        assert len(data["segments"]) == 2

    def test_returns_404_when_no_transcript(self, client, db_session):
        video = _make_video(db_session)

        resp = client.get(f"/v1/media/{video.id}/transcript")

        assert resp.status_code == 404
        assert "Transcript not found" in resp.json()["detail"]

    def test_returns_404_for_unknown_video(self, client):
        resp = client.get("/v1/media/nonexistent-id/transcript")
        assert resp.status_code == 404

    def test_segment_timestamps_correct(self, client, db_session):
        video = _make_video(db_session)
        transcript = _make_transcript(db_session, video.id)
        _make_segment(db_session, transcript.id, video.id, idx=3)

        resp = client.get(f"/v1/media/{video.id}/transcript")
        seg = resp.json()["segments"][0]

        assert seg["start_time"] == 15.0
        assert seg["end_time"] == 19.0

    def test_empty_transcript_no_segments(self, client, db_session):
        video = _make_video(db_session)
        _make_transcript(db_session, video.id, full_text="", word_count=0)

        resp = client.get(f"/v1/media/{video.id}/transcript")

        assert resp.status_code == 200
        assert resp.json()["segments"] == []


# ===========================================================================
# 2. GET /{video_id}  (VideoDetail) includes transcript inline
# ===========================================================================

class TestVideoDetailIncludesTranscript:
    def test_detail_embeds_transcript_when_present(self, client, db_session):
        video = _make_video(db_session)
        _make_transcript(db_session, video.id)

        resp = client.get(f"/v1/media/{video.id}")

        assert resp.status_code == 200
        assert resp.json()["transcript"] is not None
        assert resp.json()["transcript"]["language"] == "en"

    def test_detail_transcript_is_null_when_absent(self, client, db_session):
        video = _make_video(db_session)

        resp = client.get(f"/v1/media/{video.id}")

        assert resp.status_code == 200
        assert resp.json()["transcript"] is None


# ===========================================================================
# 3. pipeline task – process_video_pipeline (unit-level)
# ===========================================================================

class TestProcessVideoPipelineTranscription:
    """Test the transcription step inside process_video_pipeline using mocks."""

    def _fake_transcript_data(self):
        return {
            "full_text": "This is a mocked transcript.",
            "language": "en",
            "confidence": -0.15,
            "duration": 12.5,
            "segments": [
                {"text": "This is a mocked", "start": 0.0, "end": 5.0, "confidence": -0.1, "words": []},
                {"text": "transcript.", "start": 5.1, "end": 7.2, "confidence": -0.2, "words": []},
            ],
        }

    def test_transcript_saved_to_db(self, db_session):
        from app.workers import media_tasks

        video = _make_video(db_session, status="uploaded")
        fake_transcript = self._fake_transcript_data()

        with (
            patch("app.workers.media_tasks.clip_service") as mock_clip,
            patch("app.workers.media_tasks.ffmpeg_service") as mock_ffmpeg,
            patch("app.workers.media_tasks.ai_worker_client") as mock_ai,
            patch("app.workers.media_tasks.processing_job_service") as mock_jobs,
            patch("app.workers.media_tasks.video_storage"),
        ):
            mock_clip.get_video_path.return_value = "/tmp/fake.mp4"
            mock_ffmpeg.extract_audio.return_value = None
            mock_ai.transcribe_sync.return_value = fake_transcript
            mock_ai.generate_embeddings_sync.return_value = {"embeddings": [], "model": "all-MiniLM-L6-v2"}
            mock_ai.detect_topics_sync.return_value = {"topics": []}

            job = MagicMock()
            job.id = "job-001"
            mock_jobs.create.return_value = job
            mock_jobs.update_progress.return_value = None
            mock_jobs.fail.return_value = None

            media_tasks.process_video_pipeline.__wrapped__(video.id, None)

        db_session.expire_all()
        saved = (
            db_session.query(Transcript)
            .filter(Transcript.video_id == video.id)
            .first()
        )
        assert saved is not None
        assert saved.full_text == "This is a mocked transcript."
        assert saved.language == "en"
        assert saved.status == "completed"

    def test_segments_saved_to_db(self, db_session):
        from app.workers import media_tasks

        video = _make_video(db_session, status="uploaded")
        fake_transcript = self._fake_transcript_data()

        with (
            patch("app.workers.media_tasks.clip_service"),
            patch("app.workers.media_tasks.ffmpeg_service"),
            patch("app.workers.media_tasks.ai_worker_client") as mock_ai,
            patch("app.workers.media_tasks.processing_job_service") as mock_jobs,
            patch("app.workers.media_tasks.video_storage"),
        ):
            mock_ai.transcribe_sync.return_value = fake_transcript
            mock_ai.generate_embeddings_sync.return_value = {"embeddings": [], "model": "all-MiniLM-L6-v2"}
            mock_ai.detect_topics_sync.return_value = {"topics": []}

            job = MagicMock()
            job.id = "job-002"
            mock_jobs.create.return_value = job
            mock_jobs.update_progress.return_value = None

            media_tasks.process_video_pipeline.__wrapped__(video.id, None)

        db_session.expire_all()
        segments = (
            db_session.query(TranscriptSegment)
            .filter(TranscriptSegment.video_id == video.id)
            .order_by(TranscriptSegment.sequence_index)
            .all()
        )
        assert len(segments) == 2
        assert segments[0].text == "This is a mocked"
        assert segments[0].start_time == 0.0
        assert segments[1].text == "transcript."
        assert segments[1].end_time == 7.2

    def test_video_status_becomes_ready(self, db_session):
        from app.workers import media_tasks

        video = _make_video(db_session, status="uploaded")
        fake_transcript = self._fake_transcript_data()

        with (
            patch("app.workers.media_tasks.clip_service"),
            patch("app.workers.media_tasks.ffmpeg_service"),
            patch("app.workers.media_tasks.ai_worker_client") as mock_ai,
            patch("app.workers.media_tasks.processing_job_service") as mock_jobs,
            patch("app.workers.media_tasks.video_storage"),
        ):
            mock_ai.transcribe_sync.return_value = fake_transcript
            mock_ai.generate_embeddings_sync.return_value = {"embeddings": [], "model": "all-MiniLM-L6-v2"}
            mock_ai.detect_topics_sync.return_value = {"topics": []}

            job = MagicMock()
            job.id = "job-003"
            mock_jobs.create.return_value = job
            mock_jobs.update_progress.return_value = None

            media_tasks.process_video_pipeline.__wrapped__(video.id, None)

        db_session.expire_all()
        db_session.refresh(video)
        assert video.status == "ready"


# ===========================================================================
# 4. video_validation – MIME type checks for audio
# ===========================================================================

class TestVideoValidationAudioMime:
    def setup_method(self):
        from app.services.video_validation import VideoValidationService
        self.svc = VideoValidationService()

    def test_audio_mpeg_allowed(self):
        mime = self.svc.validate_mime("audio/mpeg", "track.mp3")
        assert mime == "audio/mpeg"

    def test_audio_wav_allowed(self):
        mime = self.svc.validate_mime("audio/wav", "recording.wav")
        assert mime == "audio/wav"

    def test_audio_ogg_allowed(self):
        mime = self.svc.validate_mime("audio/ogg", "podcast.ogg")
        assert mime == "audio/ogg"

    def test_audio_flac_allowed(self):
        mime = self.svc.validate_mime("audio/flac", "lossless.flac")
        assert mime == "audio/flac"

    def test_audio_m4a_allowed(self):
        mime = self.svc.validate_mime("audio/x-m4a", "file.m4a")
        assert mime == "audio/x-m4a"

    def test_video_mp4_still_allowed(self):
        mime = self.svc.validate_mime("video/mp4", "clip.mp4")
        assert mime == "video/mp4"

    def test_unknown_mime_rejected(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            self.svc.validate_mime("application/zip", "archive.zip")
        assert exc_info.value.status_code == 400

    def test_audio_extension_allowed(self):
        # validate_extension should now accept audio formats
        ext = self.svc.validate_extension("track.mp3")
        assert ext == "mp3"

    def test_wav_extension_allowed(self):
        ext = self.svc.validate_extension("recording.wav")
        assert ext == "wav"

    def test_unsupported_extension_rejected(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            self.svc.validate_extension("document.pdf")
        assert exc_info.value.status_code == 400


# ===========================================================================
# 5. _chunk_segments helper
# ===========================================================================

class TestChunkSegments:
    def _fn(self):
        from app.workers.media_tasks import _chunk_segments
        return _chunk_segments

    def test_empty_returns_empty(self):
        assert self._fn()([]) == []

    def test_single_segment_becomes_one_chunk(self):
        segs = [{"text": "Hello.", "start": 0.0, "end": 2.0}]
        chunks = self._fn()(segs)
        assert len(chunks) == 1
        assert chunks[0]["text"] == "Hello."

    def test_splits_on_large_gap(self):
        segs = [
            {"text": "Part one.", "start": 0.0, "end": 3.0},
            {"text": "Part two.", "start": 20.0, "end": 23.0},  # gap > 5 s
        ]
        chunks = self._fn()(segs)
        assert len(chunks) == 2

    def test_merges_close_segments(self):
        segs = [
            {"text": "Word one", "start": 0.0, "end": 1.0},
            {"text": "word two", "start": 1.5, "end": 2.5},
        ]
        chunks = self._fn()(segs)
        assert len(chunks) == 1
        assert "Word one" in chunks[0]["text"]
        assert "word two" in chunks[0]["text"]

    def test_splits_when_max_chars_exceeded(self):
        long_text = "x" * 400
        segs = [
            {"text": long_text, "start": 0.0, "end": 5.0},
            {"text": long_text, "start": 5.5, "end": 10.0},
        ]
        chunks = self._fn()(segs, max_chars=500)
        assert len(chunks) == 2
