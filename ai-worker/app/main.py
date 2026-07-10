import logging
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.embeddings import generate_embeddings
from app.services.topics import detect_topics, semantic_search_local, summarize_segment
from app.services.transcription import transcribe_audio

logger = logging.getLogger(__name__)

app = FastAPI(
    title="ClipFetch AI Worker",
    version="1.0.0",
    summary="Internal AI service for transcription, embeddings, and semantic search",
)


def verify_internal_key(x_internal_key: str = Header(...)) -> None:
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid internal key")


class TranscribeRequest(BaseModel):
    audio_path: str
    language: str | None = None


class EmbeddingsRequest(BaseModel):
    chunks: list[dict[str, Any]]


class TopicsRequest(BaseModel):
    segments: list[dict[str, Any]]
    duration_seconds: float = 0


class SearchRequest(BaseModel):
    query: str
    video_id: str
    top_k: int = Field(default=5, ge=1, le=20)
    chunks: list[dict[str, Any]] | None = None
    embeddings: list[list[float]] | None = None


class SummarizeRequest(BaseModel):
    text: str
    query: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-worker"}


@app.post("/internal/v1/transcribe", dependencies=[Depends(verify_internal_key)])
def transcribe(payload: TranscribeRequest):
    try:
        return transcribe_audio(payload.audio_path, payload.language)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@app.post("/internal/v1/embeddings", dependencies=[Depends(verify_internal_key)])
def embeddings(payload: EmbeddingsRequest):
    try:
        return generate_embeddings(payload.chunks)
    except Exception as exc:
        logger.exception("Embedding generation failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@app.post("/internal/v1/topics", dependencies=[Depends(verify_internal_key)])
def topics(payload: TopicsRequest):
    return detect_topics(payload.segments, payload.duration_seconds)


@app.post("/internal/v1/search", dependencies=[Depends(verify_internal_key)])
def search(payload: SearchRequest):
    if payload.chunks:
        return semantic_search_local(
            payload.query, payload.chunks, payload.embeddings, payload.top_k
        )
    return {"results": [], "message": "Provide chunks for local search or use backend pgvector"}


@app.post("/internal/v1/summarize", dependencies=[Depends(verify_internal_key)])
def summarize(payload: SummarizeRequest):
    return summarize_segment(payload.text, payload.query)
