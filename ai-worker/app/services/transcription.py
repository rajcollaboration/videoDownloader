"""Faster Whisper transcription service with word-level timestamps."""

import logging
from pathlib import Path

from faster_whisper import WhisperModel

from app.core.config import settings

logger = logging.getLogger(__name__)

_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        logger.info("Loading Whisper model: %s", settings.whisper_model_size)
        _model = WhisperModel(
            settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
    return _model


def transcribe_audio(audio_path: str, language: str | None = None) -> dict:
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model = get_model()
    segments_iter, info = model.transcribe(
        str(path),
        language=language,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    segments = []
    full_text_parts = []
    confidences = []

    for seg in segments_iter:
        text = seg.text.strip()
        if not text:
            continue
        segments.append({
            "text": text,
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "confidence": round(seg.avg_logprob, 4) if seg.avg_logprob else None,
            "words": [
                {
                    "word": w.word,
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "confidence": round(w.probability, 4) if w.probability else None,
                }
                for w in (seg.words or [])
            ],
        })
        full_text_parts.append(text)
        if seg.avg_logprob:
            confidences.append(seg.avg_logprob)

    avg_confidence = sum(confidences) / len(confidences) if confidences else None

    return {
        "full_text": " ".join(full_text_parts),
        "language": info.language,
        "language_probability": round(info.language_probability, 4),
        "confidence": round(avg_confidence, 4) if avg_confidence else None,
        "duration": round(info.duration, 3),
        "segments": segments,
    }
