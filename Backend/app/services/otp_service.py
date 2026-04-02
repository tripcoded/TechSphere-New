import hashlib
import hmac
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock

from app.config import settings


@dataclass
class OTPRecord:
    otp_hash: str
    expires_at: datetime
    attempts_remaining: int


class OTPService:
    def __init__(self) -> None:
        self._otp_records: dict[str, OTPRecord] = {}
        self._email_requests: dict[str, deque[datetime]] = defaultdict(deque)
        self._ip_requests: dict[str, deque[datetime]] = defaultdict(deque)
        self._last_sent_at: dict[str, datetime] = {}
        self._lock = Lock()

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _normalize_email(self, email: str) -> str:
        return email.strip().lower()

    def _hash_otp(self, email: str, otp_code: str) -> str:
        email_key = self._normalize_email(email)
        raw = f"{email_key}:{otp_code}:{settings.secret_key}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def _trim_window(self, events: deque[datetime], now: datetime) -> None:
        window_start = now - timedelta(seconds=settings.otp_rate_window_seconds)
        while events and events[0] < window_start:
            events.popleft()

    def can_send(self, email: str, ip_address: str) -> tuple[bool, str]:
        email_key = self._normalize_email(email)
        ip_key = (ip_address or "unknown").strip()
        now = self._now()

        with self._lock:
            email_events = self._email_requests[email_key]
            ip_events = self._ip_requests[ip_key]

            self._trim_window(email_events, now)
            self._trim_window(ip_events, now)

            if len(email_events) >= settings.otp_email_max_requests:
                return False, "Too many OTP requests for this email. Please try later."

            if len(ip_events) >= settings.otp_ip_max_requests:
                return False, "Too many OTP requests from this IP. Please try later."

            last_sent = self._last_sent_at.get(email_key)
            if last_sent and (now - last_sent).total_seconds() < settings.otp_resend_cooldown_seconds:
                return False, f"Please wait {settings.otp_resend_cooldown_seconds} seconds before requesting again."

            return True, ""

    def register_send(self, email: str, ip_address: str) -> None:
        email_key = self._normalize_email(email)
        ip_key = (ip_address or "unknown").strip()
        now = self._now()
        with self._lock:
            self._email_requests[email_key].append(now)
            self._ip_requests[ip_key].append(now)
            self._last_sent_at[email_key] = now

    def set_otp(self, email: str, otp_code: str) -> None:
        email_key = self._normalize_email(email)
        now = self._now()
        record = OTPRecord(
            otp_hash=self._hash_otp(email_key, otp_code),
            expires_at=now + timedelta(seconds=settings.otp_ttl_seconds),
            attempts_remaining=settings.otp_max_attempts,
        )
        with self._lock:
            self._otp_records[email_key] = record

    def clear_otp(self, email: str) -> None:
        email_key = self._normalize_email(email)
        with self._lock:
            self._otp_records.pop(email_key, None)

    def verify_otp(self, email: str, otp_code: str) -> bool:
        email_key = self._normalize_email(email)
        now = self._now()
        with self._lock:
            record = self._otp_records.get(email_key)
            if not record:
                return False

            if now > record.expires_at:
                self._otp_records.pop(email_key, None)
                return False

            is_match = hmac.compare_digest(record.otp_hash, self._hash_otp(email_key, otp_code))
            if is_match:
                self._otp_records.pop(email_key, None)
                return True

            record.attempts_remaining -= 1
            if record.attempts_remaining <= 0:
                self._otp_records.pop(email_key, None)
            else:
                self._otp_records[email_key] = record
            return False

