import logging
from typing import Any

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.embedding import Embedding, Topic
from app.models.transcript import Transcript, TranscriptChunk, TranscriptSegment
from app.services.ai_worker_client import ai_worker_client

logger = logging.getLogger(__name__)


class SearchService:
  def semantic_search(
      self, db: Session, video_id: str, query: str, top_k: int = 5
  ) -> list[dict[str, Any]]:
      """Search transcript chunks using vector similarity via pgvector."""
      try:
          result = ai_worker_client.semantic_search_sync(query, video_id, top_k)
          if result.get("results"):
              return self._enrich_results(db, result["results"])
      except Exception as exc:
          logger.warning("AI worker search failed, falling back to pgvector: %s", exc)

      query_embedding = self._embed_query(query)
      if not query_embedding:
          return self._keyword_fallback(db, video_id, query, top_k)

      embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
      sql = text("""
          SELECT
              tc.id as chunk_id,
              tc.text,
              tc.start_time,
              tc.end_time,
              1 - (e.embedding <=> :query_embedding::vector) as similarity
          FROM embeddings e
          JOIN transcript_chunks tc ON tc.id = e.chunk_id
          WHERE e.video_id = :video_id
          ORDER BY e.embedding <=> :query_embedding::vector
          LIMIT :top_k
      """)
      rows = db.execute(
          sql,
          {"query_embedding": embedding_str, "video_id": video_id, "top_k": top_k},
      ).fetchall()

      results = []
      for row in rows:
          summary = self._summarize_chunk(row.text, query)
          results.append({
              "chunk_id": row.chunk_id,
              "text": row.text,
              "start_time": row.start_time,
              "end_time": row.end_time,
              "confidence": float(row.similarity),
              "summary": summary,
          })
      return self._merge_adjacent_segments(results)

  def _embed_query(self, query: str) -> list[float] | None:
      try:
          result = ai_worker_client.generate_embeddings_sync([{"text": query}])
          embeddings = result.get("embeddings", [])
          return embeddings[0] if embeddings else None
      except Exception:
          return None

  def _keyword_fallback(
      self, db: Session, video_id: str, query: str, top_k: int
  ) -> list[dict[str, Any]]:
      terms = query.lower().split()
      chunks = (
          db.query(TranscriptChunk)
          .filter(TranscriptChunk.video_id == video_id)
          .order_by(TranscriptChunk.start_time)
          .all()
      )
      scored = []
      for chunk in chunks:
          text_lower = chunk.text.lower()
          score = sum(1 for t in terms if t in text_lower) / max(len(terms), 1)
          if score > 0:
              scored.append((score, chunk))
      scored.sort(key=lambda x: x[0], reverse=True)
      results = []
      for score, chunk in scored[:top_k]:
          results.append({
              "chunk_id": chunk.id,
              "text": chunk.text,
              "start_time": chunk.start_time,
              "end_time": chunk.end_time,
              "confidence": score,
              "summary": chunk.text[:200],
          })
      return self._merge_adjacent_segments(results)

  def _enrich_results(self, db: Session, results: list[dict]) -> list[dict]:
      enriched = []
      for r in results:
          chunk = db.get(TranscriptChunk, r.get("chunk_id"))
          if chunk:
              enriched.append({
                  "chunk_id": chunk.id,
                  "text": chunk.text,
                  "start_time": chunk.start_time,
                  "end_time": chunk.end_time,
                  "confidence": r.get("confidence", 0.5),
                  "summary": r.get("summary", chunk.text[:200]),
              })
      return self._merge_adjacent_segments(enriched)

  def _merge_adjacent_segments(self, results: list[dict]) -> list[dict]:
      if not results:
          return []
      sorted_results = sorted(results, key=lambda r: r["start_time"])
      merged = [sorted_results[0].copy()]
      for current in sorted_results[1:]:
          last = merged[-1]
          if current["start_time"] - last["end_time"] <= 30:
              last["end_time"] = max(last["end_time"], current["end_time"])
              last["text"] = last["text"] + " " + current["text"]
              last["confidence"] = max(last["confidence"], current["confidence"])
          else:
              merged.append(current.copy())
      return merged

  def _summarize_chunk(self, text: str, query: str | None) -> str:
      try:
          result = ai_worker_client.summarize_segment_sync(text, query)
          return result.get("summary", text[:200])
      except Exception:
          return text[:200]

  def get_topics(self, db: Session, video_id: str) -> list[Topic]:
      return (
          db.query(Topic)
          .filter(Topic.video_id == video_id)
          .order_by(Topic.start_time)
          .all()
      )

  def get_transcript(self, db: Session, video_id: str) -> Transcript | None:
      return (
          db.query(Transcript)
          .filter(Transcript.video_id == video_id)
          .order_by(Transcript.created_at.desc())
          .first()
      )

  def get_segments(self, db: Session, transcript_id: str) -> list[TranscriptSegment]:
      return (
          db.query(TranscriptSegment)
          .filter(TranscriptSegment.transcript_id == transcript_id)
          .order_by(TranscriptSegment.sequence_index)
          .all()
      )


search_service = SearchService()
