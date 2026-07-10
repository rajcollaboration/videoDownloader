import logging
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIWorkerClient:
    """HTTP client for the dedicated Python AI worker microservice."""

    def __init__(self) -> None:
        self.base_url = settings.ai_worker_url.rstrip("/")
        self.headers = {"X-Internal-Key": settings.ai_worker_internal_key}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.post(
                f"{self.base_url}{path}",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _get(self, path: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.get(f"{self.base_url}{path}", headers=self.headers)
            response.raise_for_status()
            return response.json()

    def transcribe_sync(self, audio_path: str, language: str | None = None) -> dict[str, Any]:
        import asyncio

        return asyncio.run(
            self._post("/internal/v1/transcribe", {"audio_path": audio_path, "language": language})
        )

    def generate_embeddings_sync(self, chunks: list[dict[str, Any]]) -> dict[str, Any]:
        import asyncio

        return asyncio.run(self._post("/internal/v1/embeddings", {"chunks": chunks}))

    def detect_topics_sync(self, segments: list[dict[str, Any]], duration: float) -> dict[str, Any]:
        import asyncio

        return asyncio.run(
            self._post("/internal/v1/topics", {"segments": segments, "duration_seconds": duration})
        )

    def semantic_search_sync(
        self, query: str, video_id: str, top_k: int = 5
    ) -> dict[str, Any]:
        import asyncio

        return asyncio.run(
            self._post(
                "/internal/v1/search",
                {"query": query, "video_id": video_id, "top_k": top_k},
            )
        )

    def summarize_segment_sync(self, text: str, query: str | None = None) -> dict[str, Any]:
        import asyncio

        return asyncio.run(
            self._post("/internal/v1/summarize", {"text": text, "query": query})
        )


ai_worker_client = AIWorkerClient()
