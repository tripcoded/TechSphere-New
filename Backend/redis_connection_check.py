"""Quick Redis connectivity check using app config / .env values."""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings
from app.redis_client import get_redis_client


def main() -> None:
    print(f"REDIS_URL configured: {bool(settings.redis_url)}")
    if settings.redis_url:
        print(f"REDIS_URL scheme: {settings.redis_url.split('://', 1)[0]}")
    print(f"REDIS_PREFIX: {settings.redis_prefix!r}")

    try:
        client = get_redis_client()
        print("PING:", client.ping())
        print("Redis connection successful!")
    except Exception as exc:
        print(f"Redis connection failed: {exc.__class__.__name__}: {exc}")


if __name__ == "__main__":
    main()
