"""Sentence-transformer embedding generation for semantic search."""

import logging

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s", settings.embedding_model)
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def generate_embeddings(chunks: list[dict]) -> dict:
    texts = [c.get("text", "") for c in chunks]
    model = get_embedding_model()
    vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return {
        "model": settings.embedding_model,
        "dimensions": settings.embedding_dimensions,
        "embeddings": [v.tolist() for v in vectors],
    }


def embed_query(query: str) -> list[float]:
    model = get_embedding_model()
    vector = model.encode([query], normalize_embeddings=True, show_progress_bar=False)
    return vector[0].tolist()
