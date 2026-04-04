import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

try:
    from redis.exceptions import RedisError, WatchError
except ImportError:  # pragma: no cover - exercised only when dependency is missing
    RedisError = RuntimeError  # type: ignore[assignment]

    class WatchError(RuntimeError):
        pass

from app.config import settings
from app.redis_client import get_redis_client, namespaced_key


class OTPStoreUnavailableError(RuntimeError):
    pass


class OTPService:
    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _normalize_email(self, email: str) -> str:
        return email.strip().lower()

    def _normalize_ip(self, ip_address: str) -> str:
        return (ip_address or "unknown").strip() or "unknown"

    def _hash_otp(self, email: str, otp_code: str) -> str:
        email_key = self._normalize_email(email)
        raw = f"{email_key}:{otp_code}:{settings.secret_key}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def _otp_key(self, email: str) -> str:
        return namespaced_key("otp", self._normalize_email(email))

    def _email_requests_key(self, email: str) -> str:
        return namespaced_key("otp", "rate", "email", self._normalize_email(email))

    def _ip_requests_key(self, ip_address: str) -> str:
        return namespaced_key("otp", "rate", "ip", self._normalize_ip(ip_address))

    def _cooldown_key(self, email: str) -> str:
        return namespaced_key("otp", "cooldown", self._normalize_email(email))

    def can_send(self, email: str, ip_address: str) -> tuple[bool, str]:
        email_key = self._normalize_email(email)
        now = self._now()
        window_start = int((now - timedelta(seconds=settings.otp_rate_window_seconds)).timestamp())

        try:
            redis_client = get_redis_client()
            pipeline = redis_client.pipeline()
            pipeline.zremrangebyscore(self._email_requests_key(email_key), "-inf", window_start)
            pipeline.zremrangebyscore(self._ip_requests_key(ip_address), "-inf", window_start)
            pipeline.zcard(self._email_requests_key(email_key))
            pipeline.zcard(self._ip_requests_key(ip_address))
            pipeline.ttl(self._cooldown_key(email_key))
            _, _, email_count, ip_count, cooldown_ttl = pipeline.execute()
        except (RedisError, RuntimeError) as exc:
            raise OTPStoreUnavailableError("OTP storage is unavailable.") from exc

        if email_count >= settings.otp_email_max_requests:
            return False, "Too many OTP requests for this email. Please try later."

        if ip_count >= settings.otp_ip_max_requests:
            return False, "Too many OTP requests from this IP. Please try later."

        if cooldown_ttl and cooldown_ttl > 0:
            return False, f"Please wait {cooldown_ttl} seconds before requesting again."

        return True, ""

    def register_send(self, email: str, ip_address: str) -> None:
        email_key = self._normalize_email(email)
        now = self._now()
        event_score = int(now.timestamp())
        ttl_seconds = settings.otp_rate_window_seconds + 60
        email_member = f"{event_score}:{secrets.token_hex(8)}"
        ip_member = f"{event_score}:{secrets.token_hex(8)}"

        try:
            redis_client = get_redis_client()
            pipeline = redis_client.pipeline()
            pipeline.zadd(self._email_requests_key(email_key), {email_member: event_score})
            pipeline.expire(self._email_requests_key(email_key), ttl_seconds)
            pipeline.zadd(self._ip_requests_key(ip_address), {ip_member: event_score})
            pipeline.expire(self._ip_requests_key(ip_address), ttl_seconds)
            pipeline.set(self._cooldown_key(email_key), str(event_score), ex=settings.otp_resend_cooldown_seconds)
            pipeline.execute()
        except (RedisError, RuntimeError) as exc:
            raise OTPStoreUnavailableError("OTP storage is unavailable.") from exc

    def set_otp(self, email: str, otp_code: str) -> None:
        email_key = self._normalize_email(email)
        now = self._now()
        payload = {
            "otp_hash": self._hash_otp(email_key, otp_code),
            "expires_at": (now + timedelta(seconds=settings.otp_ttl_seconds)).isoformat(),
            "attempts_remaining": settings.otp_max_attempts,
        }

        try:
            redis_client = get_redis_client()
            redis_client.set(self._otp_key(email_key), json.dumps(payload), ex=settings.otp_ttl_seconds)
        except (RedisError, RuntimeError) as exc:
            raise OTPStoreUnavailableError("OTP storage is unavailable.") from exc

    def clear_otp(self, email: str) -> None:
        email_key = self._normalize_email(email)
        try:
            redis_client = get_redis_client()
            redis_client.delete(self._otp_key(email_key))
        except (RedisError, RuntimeError) as exc:
            raise OTPStoreUnavailableError("OTP storage is unavailable.") from exc

    def verify_otp(self, email: str, otp_code: str) -> bool:
        email_key = self._normalize_email(email)
        now = self._now()
        key = self._otp_key(email_key)

        try:
            redis_client = get_redis_client()
            while True:
                try:
                    with redis_client.pipeline() as pipeline:
                        pipeline.watch(key)
                        raw_record = pipeline.get(key)
                        ttl_ms = pipeline.pttl(key)

                        if not raw_record or ttl_ms <= 0:
                            pipeline.multi()
                            pipeline.delete(key)
                            pipeline.execute()
                            return False

                        try:
                            record = json.loads(raw_record)
                            expires_at = datetime.fromisoformat(record["expires_at"])
                            attempts_remaining = int(record["attempts_remaining"])
                            stored_hash = str(record["otp_hash"])
                        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
                            pipeline.multi()
                            pipeline.delete(key)
                            pipeline.execute()
                            return False

                        if now > expires_at:
                            pipeline.multi()
                            pipeline.delete(key)
                            pipeline.execute()
                            return False

                        is_match = hmac.compare_digest(stored_hash, self._hash_otp(email_key, otp_code))
                        pipeline.multi()
                        if is_match:
                            pipeline.delete(key)
                            pipeline.execute()
                            return True

                        attempts_remaining -= 1
                        if attempts_remaining <= 0:
                            pipeline.delete(key)
                        else:
                            record["attempts_remaining"] = attempts_remaining
                            pipeline.set(key, json.dumps(record), px=ttl_ms)
                        pipeline.execute()
                        return False
                except WatchError:
                    continue
        except (RedisError, RuntimeError) as exc:
            raise OTPStoreUnavailableError("OTP storage is unavailable.") from exc
