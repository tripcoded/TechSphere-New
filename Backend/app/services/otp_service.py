import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from threading import Lock

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


_memory_lock = Lock()
_memory_otps: dict[str, dict[str, str | int]] = {}
_memory_email_requests: dict[str, list[int]] = {}
_memory_ip_requests: dict[str, list[int]] = {}
_memory_cooldowns: dict[str, datetime] = {}


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

    def _use_memory_store(self) -> bool:
        return settings.otp_use_memory_store or not settings.redis_url

    def can_send(self, email: str, ip_address: str) -> tuple[bool, str]:
        email_key = self._normalize_email(email)
        ip_key = self._normalize_ip(ip_address)
        now = self._now()
        window_start = int((now - timedelta(seconds=settings.otp_rate_window_seconds)).timestamp())

        if self._use_memory_store():
            with _memory_lock:
                email_events = [score for score in _memory_email_requests.get(email_key, []) if score > window_start]
                ip_events = [score for score in _memory_ip_requests.get(ip_key, []) if score > window_start]
                _memory_email_requests[email_key] = email_events
                _memory_ip_requests[ip_key] = ip_events

                cooldown_expires_at = _memory_cooldowns.get(email_key)
                if cooldown_expires_at and cooldown_expires_at <= now:
                    _memory_cooldowns.pop(email_key, None)
                    cooldown_expires_at = None

                cooldown_ttl = int((cooldown_expires_at - now).total_seconds()) if cooldown_expires_at else 0

            if len(email_events) >= settings.otp_email_max_requests:
                return False, "Too many OTP requests for this email. Please try later."

            if len(ip_events) >= settings.otp_ip_max_requests:
                return False, "Too many OTP requests from this IP. Please try later."

            if cooldown_ttl > 0:
                return False, f"Please wait {cooldown_ttl} seconds before requesting again."

            return True, ""

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
        ip_key = self._normalize_ip(ip_address)
        now = self._now()
        event_score = int(now.timestamp())
        ttl_seconds = settings.otp_rate_window_seconds + 60
        email_member = f"{event_score}:{secrets.token_hex(8)}"
        ip_member = f"{event_score}:{secrets.token_hex(8)}"

        if self._use_memory_store():
            with _memory_lock:
                _memory_email_requests.setdefault(email_key, []).append(event_score)
                _memory_ip_requests.setdefault(ip_key, []).append(event_score)
                _memory_cooldowns[email_key] = now + timedelta(seconds=settings.otp_resend_cooldown_seconds)
            return

        try:
            redis_client = get_redis_client()
            pipeline = redis_client.pipeline()
            pipeline.zadd(self._email_requests_key(email_key), {email_member: event_score})
            pipeline.expire(self._email_requests_key(email_key), ttl_seconds)
            pipeline.zadd(self._ip_requests_key(ip_key), {ip_member: event_score})
            pipeline.expire(self._ip_requests_key(ip_key), ttl_seconds)
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

        if self._use_memory_store():
            with _memory_lock:
                _memory_otps[self._otp_key(email_key)] = payload
            return

        try:
            redis_client = get_redis_client()
            redis_client.set(self._otp_key(email_key), json.dumps(payload), ex=settings.otp_ttl_seconds)
        except (RedisError, RuntimeError) as exc:
            raise OTPStoreUnavailableError("OTP storage is unavailable.") from exc

    def clear_otp(self, email: str) -> None:
        email_key = self._normalize_email(email)
        if self._use_memory_store():
            with _memory_lock:
                _memory_otps.pop(self._otp_key(email_key), None)
            return

        try:
            redis_client = get_redis_client()
            redis_client.delete(self._otp_key(email_key))
        except (RedisError, RuntimeError) as exc:
            raise OTPStoreUnavailableError("OTP storage is unavailable.") from exc

    def verify_otp(self, email: str, otp_code: str) -> bool:
        email_key = self._normalize_email(email)
        now = self._now()
        key = self._otp_key(email_key)

        if self._use_memory_store():
            with _memory_lock:
                record = _memory_otps.get(key)
                if not record:
                    return False

                try:
                    expires_at = datetime.fromisoformat(str(record["expires_at"]))
                    attempts_remaining = int(record["attempts_remaining"])
                    stored_hash = str(record["otp_hash"])
                except (KeyError, TypeError, ValueError):
                    _memory_otps.pop(key, None)
                    return False

                if now > expires_at:
                    _memory_otps.pop(key, None)
                    return False

                is_match = hmac.compare_digest(stored_hash, self._hash_otp(email_key, otp_code))
                if is_match:
                    _memory_otps.pop(key, None)
                    return True

                attempts_remaining -= 1
                if attempts_remaining <= 0:
                    _memory_otps.pop(key, None)
                else:
                    record["attempts_remaining"] = attempts_remaining
                return False

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
