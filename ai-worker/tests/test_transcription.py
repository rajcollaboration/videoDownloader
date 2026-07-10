"""Tests for the AI-worker transcription service and /internal/v1/transcribe endpoint."""
import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")

from app.main import app  # noqa: E402  (env must be set first)

HEADERS = {"x-internal-key": "test-internal-key"}
WRONG_HEADERS = {"x-internal-key": "wrong-key"}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ===========================================================================
# 1. /health
# ===========================================================================

def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ===========================================================================
# 2. Authentication guard on /internal/v1/transcribe
# ===========================================================================

class TestTranscribeAuth:
    def test_missing_key_returns_422(self, client):
        resp = client.post("/internal/v1/transcribe", json={"audio_path": "/tmp/a.wav"})
        assert resp.status_code == 422

    def test_wrong_key_returns_403(self, client):
        resp = client.post(
            "/internal/v1/transcribe",
            json={"audio_path": "/tmp/a.wav"},
            headers=WRONG_HEADERS,
        )
        assert resp.status_code == 403
        assert "Invalid internal key" in resp.json()["detail"]


# ===========================================================================
# 3. /internal/v1/transcribe – happy path (mocked Whisper)
# ===========================================================================

FAKE_TRANSCRIBE_RESULT = {
    "full_text": "Hello world.",
    "language": "en",
    "language_probability": 0.99,
    "confidence": -0.18,
    "duration": 5.0,
    "segments": [
        {
            "text": "Hello world.",
            "start": 0.0,
            "end": 5.0,
            "confidence": -0.18,
            "words": [
                {"word": "Hello", "start": 0.0, "end": 0.5, "confidence": 0.95},
                {"word": "world.", "start": 0.6, "end": 1.2, "confidence": 0.92},
            ],
        }
    ],
}


class TestTranscribeEndpoint:
    def test_successful_transcription(self, client, tmp_path):
        audio_file = tmp_path / "test.wav"
        audio_file.write_bytes(b"\x00" * 100)  # dummy bytes

        with patch("app.main.transcribe_audio", return_value=FAKE_TRANSCRIBE_RESULT):
            resp = client.post(
                "/internal/v1/transcribe",
                json={"audio_path": str(audio_file)},
                headers=HEADERS,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["full_text"] == "Hello world."
        assert data["language"] == "en"
        assert len(data["segments"]) == 1

    def test_language_override_passed_through(self, client, tmp_path):
        audio_file = tmp_path / "test.wav"
        audio_file.write_bytes(b"\x00" * 100)

        captured = {}

        def fake_transcribe(audio_path, language=None):
            captured["language"] = language
            return FAKE_TRANSCRIBE_RESULT

        with patch("app.main.transcribe_audio", side_effect=fake_transcribe):
            client.post(
                "/internal/v1/transcribe",
                json={"audio_path": str(audio_file), "language": "fr"},
                headers=HEADERS,
            )

        assert captured["language"] == "fr"

    def test_missing_file_returns_404(self, client):
        with patch("app.main.transcribe_audio", side_effect=FileNotFoundError("Audio file not found: /bad/path.wav")):
            resp = client.post(
                "/internal/v1/transcribe",
                json={"audio_path": "/bad/path.wav"},
                headers=HEADERS,
            )

        assert resp.status_code == 404
        assert "Audio file not found" in resp.json()["detail"]

    def test_whisper_error_returns_500(self, client, tmp_path):
        audio_file = tmp_path / "bad.wav"
        audio_file.write_bytes(b"\x00")

        with patch("app.main.transcribe_audio", side_effect=RuntimeError("Whisper exploded")):
            resp = client.post(
                "/internal/v1/transcribe",
                json={"audio_path": str(audio_file)},
                headers=HEADERS,
            )

        assert resp.status_code == 500

    def test_response_contains_word_timestamps(self, client, tmp_path):
        audio_file = tmp_path / "test.wav"
        audio_file.write_bytes(b"\x00" * 100)

        with patch("app.main.transcribe_audio", return_value=FAKE_TRANSCRIBE_RESULT):
            resp = client.post(
                "/internal/v1/transcribe",
                json={"audio_path": str(audio_file)},
                headers=HEADERS,
            )

        words = resp.json()["segments"][0]["words"]
        assert len(words) == 2
        assert words[0]["word"] == "Hello"
        assert words[0]["start"] == 0.0


# ===========================================================================
# 4. transcribe_audio() service – unit tests (mocked WhisperModel)
# ===========================================================================

class TestTranscribeAudioService:
    def _make_seg(self, text, start, end, logprob=-0.2, words=None):
        seg = MagicMock()
        seg.text = text
        seg.start = start
        seg.end = end
        seg.avg_logprob = logprob
        seg.words = words or []
        return seg

    def _make_word(self, word, start, end, prob=0.9):
        w = MagicMock()
        w.word = word
        w.start = start
        w.end = end
        w.probability = prob
        return w

    def _make_info(self, language="en", lang_prob=0.99, duration=10.0):
        info = MagicMock()
        info.language = language
        info.language_probability = lang_prob
        info.duration = duration
        return info

    @pytest.fixture(autouse=True)
    def reset_model_cache(self):
        """Ensure the global model singleton is reset between tests."""
        import app.services.transcription as t_mod
        original = t_mod._model
        t_mod._model = None
        yield
        t_mod._model = None

    def test_file_not_found_raises(self, tmp_path):
        from app.services.transcription import transcribe_audio
        with pytest.raises(FileNotFoundError, match="Audio file not found"):
            transcribe_audio(str(tmp_path / "nonexistent.wav"))

    def test_returns_full_text(self, tmp_path):
        audio = tmp_path / "audio.wav"
        audio.write_bytes(b"\x00" * 100)

        seg = self._make_seg("Hello world.", 0.0, 2.0)
        info = self._make_info()

        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter([seg]), info)

        with patch("app.services.transcription.get_model", return_value=mock_model):
            result = __import__("app.services.transcription", fromlist=["transcribe_audio"]).transcribe_audio(str(audio))

        assert result["full_text"] == "Hello world."

    def test_empty_segments_produces_empty_text(self, tmp_path):
        audio = tmp_path / "silence.wav"
        audio.write_bytes(b"\x00" * 100)

        info = self._make_info(duration=5.0)
        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter([]), info)

        with patch("app.services.transcription.get_model", return_value=mock_model):
            from app.services.transcription import transcribe_audio
            result = transcribe_audio(str(audio))

        assert result["full_text"] == ""
        assert result["segments"] == []
        assert result["confidence"] is None

    def test_language_detected(self, tmp_path):
        audio = tmp_path / "audio.wav"
        audio.write_bytes(b"\x00" * 100)

        seg = self._make_seg("Bonjour le monde.", 0.0, 2.0)
        info = self._make_info(language="fr", lang_prob=0.97)
        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter([seg]), info)

        with patch("app.services.transcription.get_model", return_value=mock_model):
            from app.services.transcription import transcribe_audio
            result = transcribe_audio(str(audio))

        assert result["language"] == "fr"
        assert result["language_probability"] == 0.97

    def test_word_timestamps_included(self, tmp_path):
        audio = tmp_path / "audio.wav"
        audio.write_bytes(b"\x00" * 100)

        w1 = self._make_word("Hello", 0.0, 0.5)
        w2 = self._make_word("world.", 0.6, 1.2)
        seg = self._make_seg("Hello world.", 0.0, 1.5, words=[w1, w2])
        info = self._make_info()
        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter([seg]), info)

        with patch("app.services.transcription.get_model", return_value=mock_model):
            from app.services.transcription import transcribe_audio
            result = transcribe_audio(str(audio))

        words = result["segments"][0]["words"]
        assert len(words) == 2
        assert words[0] == {"word": "Hello", "start": 0.0, "end": 0.5, "confidence": 0.9}

    def test_confidence_averaged_across_segments(self, tmp_path):
        audio = tmp_path / "audio.wav"
        audio.write_bytes(b"\x00" * 100)

        seg1 = self._make_seg("First.", 0.0, 2.0, logprob=-0.2)
        seg2 = self._make_seg("Second.", 2.5, 5.0, logprob=-0.4)
        info = self._make_info()
        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter([seg1, seg2]), info)

        with patch("app.services.transcription.get_model", return_value=mock_model):
            from app.services.transcription import transcribe_audio
            result = transcribe_audio(str(audio))

        assert result["confidence"] == pytest.approx(-0.3, abs=1e-4)

    def test_blank_segment_text_skipped(self, tmp_path):
        audio = tmp_path / "audio.wav"
        audio.write_bytes(b"\x00" * 100)

        blank = self._make_seg("   ", 0.0, 1.0)
        real = self._make_seg("Valid text.", 2.0, 4.0)
        info = self._make_info()
        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter([blank, real]), info)

        with patch("app.services.transcription.get_model", return_value=mock_model):
            from app.services.transcription import transcribe_audio
            result = transcribe_audio(str(audio))

        assert len(result["segments"]) == 1
        assert result["full_text"] == "Valid text."

    def test_language_hint_passed_to_model(self, tmp_path):
        audio = tmp_path / "audio.wav"
        audio.write_bytes(b"\x00" * 100)

        info = self._make_info(language="de")
        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter([]), info)

        with patch("app.services.transcription.get_model", return_value=mock_model):
            from app.services.transcription import transcribe_audio
            transcribe_audio(str(audio), language="de")

        call_kwargs = mock_model.transcribe.call_args.kwargs
        assert call_kwargs.get("language") == "de"

    def test_vad_filter_enabled(self, tmp_path):
        audio = tmp_path / "audio.wav"
        audio.write_bytes(b"\x00" * 100)

        info = self._make_info()
        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter([]), info)

        with patch("app.services.transcription.get_model", return_value=mock_model):
            from app.services.transcription import transcribe_audio
            transcribe_audio(str(audio))

        call_kwargs = mock_model.transcribe.call_args.kwargs
        assert call_kwargs.get("vad_filter") is True
