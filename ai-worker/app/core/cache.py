import json
from hashlib import sha256

import redis

from app.core.config import settings

redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)


def build_cache_key(prefix: str, value: str) -> str:
    digest = sha256(value.encode("utf-8")).hexdigest()
    return f"{prefix}:{digest}"


def set_json(key: str, payload: dict, ttl_seconds: int = 900) -> None:
    redis_client.set(key, json.dumps(payload), ex=ttl_seconds)


def get_json(key: str) -> dict | None:
    raw = redis_client.get(key)
    return json.loads(raw) if raw else None

