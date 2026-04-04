from __future__ import annotations

import logging
from functools import lru_cache
from urllib.parse import urlparse

try:
    from redis import Redis
except ImportError:  # pragma: no cover - exercised only when dependency is missing
    Redis = None  # type: ignore[assignment]

from .config import settings

logger = logging.getLogger(__name__)


def namespaced_key(*parts: str) -> str:
    segments = [segment for segment in [settings.redis_prefix, *parts] if segment]
    return ":".join(segments)


@lru_cache(maxsize=1)
def get_redis_client():
    if Redis is None:
        raise RuntimeError("The redis package is not installed.")
    if not settings.redis_url:
        raise RuntimeError("REDIS_URL is not configured.")

    try:
        client = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            health_check_interval=30,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        client.ping()
        return client
    except Exception:
        parsed = urlparse(settings.redis_url)
        logger.exception(
            "Redis connection failed. scheme=%s host=%s port=%s",
            parsed.scheme or "<missing>",
            parsed.hostname or "<missing>",
            parsed.port or "<missing>",
        )
        raise
