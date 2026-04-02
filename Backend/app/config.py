import os

from dotenv import load_dotenv

load_dotenv()


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


class Settings:
    app_name: str = os.getenv("APP_NAME", "TechSphere Event Management API")
    app_env: str = os.getenv("APP_ENV", "development")
    app_debug: bool = _get_bool("APP_DEBUG", False)

    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = _get_int("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24)
    password_hash_iterations: int = _get_int("PASSWORD_HASH_ITERATIONS", 120_000)

    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./techsphere.db")

    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = _get_int("SMTP_PORT", 587)
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", smtp_user or "no-reply@techsphere.local")
    smtp_use_tls: bool = _get_bool("SMTP_USE_TLS", True)
    smtp_use_ssl: bool = _get_bool("SMTP_USE_SSL", False)

    otp_length: int = _get_int("OTP_LENGTH", 6)
    otp_ttl_seconds: int = _get_int("OTP_TTL_SECONDS", 300)
    otp_max_attempts: int = _get_int("OTP_MAX_ATTEMPTS", 5)
    otp_resend_cooldown_seconds: int = _get_int("OTP_RESEND_COOLDOWN_SECONDS", 60)
    otp_email_max_requests: int = _get_int("OTP_EMAIL_MAX_REQUESTS", 3)
    otp_ip_max_requests: int = _get_int("OTP_IP_MAX_REQUESTS", 10)
    otp_rate_window_seconds: int = _get_int("OTP_RATE_WINDOW_SECONDS", 900)

    admin_api_key: str = os.getenv("ADMIN_API_KEY", "change-admin-key")


settings = Settings()
