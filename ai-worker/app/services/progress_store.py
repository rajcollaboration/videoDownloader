"""Redis-backed live progress store.

Celery workers publish high-frequency progress updates (from yt-dlp hooks)
here instead of hammering Postgres. The HTTP progress endpoint merges these
values on top of the durable DB state.
"""
from __future__ import annotations

import json
from typing import Any

import redis

from app.core.cache import redis_client

_TTL_SECONDS = 3600  # live progress entries auto-expire 1h after last update


def _job_key(job_id: str) -> str:
    return f"progress:job:{job_id}"


def _item_key(job_id: str, position: int) -> str:
    return f"progress:job:{job_id}:item:{position}"


def publish_job(job_id: str, **fields: Any) -> None:
    """Merge-write live progress fields for a job."""
    if not fields:
        return
    key = _job_key(job_id)
    try:
        existing = redis_client.get(key)
        payload: dict[str, Any] = json.loads(existing) if existing else {}
        payload.update({k: v for k, v in fields.items() if v is not None})
        redis_client.set(key, json.dumps(payload), ex=_TTL_SECONDS)
    except redis.exceptions.RedisError:
        # Live progress should never break downloads/API responses.
        return


def publish_item(job_id: str, position: int, **fields: Any) -> None:
    if not fields:
        return
    key = _item_key(job_id, position)
    try:
        existing = redis_client.get(key)
        payload: dict[str, Any] = json.loads(existing) if existing else {}
        payload.update({k: v for k, v in fields.items() if v is not None})
        redis_client.set(key, json.dumps(payload), ex=_TTL_SECONDS)
    except redis.exceptions.RedisError:
        return


def read_job(job_id: str) -> dict[str, Any]:
    try:
        raw = redis_client.get(_job_key(job_id))
        return json.loads(raw) if raw else {}
    except redis.exceptions.RedisError:
        return {}


def read_item(job_id: str, position: int) -> dict[str, Any]:
    try:
        raw = redis_client.get(_item_key(job_id, position))
        return json.loads(raw) if raw else {}
    except redis.exceptions.RedisError:
        return {}


def clear_job(job_id: str) -> None:
    try:
        redis_client.delete(_job_key(job_id))
    except redis.exceptions.RedisError:
        return
