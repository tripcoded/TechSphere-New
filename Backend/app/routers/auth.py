import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, RegisterResponse, SendOTPRequest, TokenResponse, UserResponse
from app.security import create_access_token, hash_password, verify_password
from app.services.email_service import EmailService
from app.services.otp_service import OTPService, OTPStoreUnavailableError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

otp_service = OTPService()
email_service = EmailService()


@router.post("/send-otp")
def send_otp(payload: SendOTPRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    try:
        can_send, reason = otp_service.can_send(payload.email, client_ip)
    except OTPStoreUnavailableError as exc:
        logger.exception("OTP availability check failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OTP service is temporarily unavailable. Please try again later.",
        )
    if not can_send:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=reason)

    otp_code = "".join(str(secrets.randbelow(10)) for _ in range(settings.otp_length))
    try:
        otp_service.set_otp(payload.email, otp_code)
    except OTPStoreUnavailableError as exc:
        logger.exception("OTP write failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OTP service is temporarily unavailable. Please try again later.",
        )

    try:
        email_service.send_otp_email(payload.email, otp_code)
    except Exception as exc:
        try:
            otp_service.clear_otp(payload.email)
        except OTPStoreUnavailableError:
            logger.warning("OTP cleanup skipped because Redis is unavailable.")
        logger.exception("OTP email delivery failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send OTP right now. Please try again later.",
        )

    try:
        otp_service.register_send(payload.email, client_ip)
    except OTPStoreUnavailableError:
        logger.warning("OTP was sent but rate-limit counters could not be updated.")
    return {"message": "OTP sent successfully"}


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()
    existing_user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    try:
        otp_valid = otp_service.verify_otp(normalized_email, payload.otp)
    except OTPStoreUnavailableError as exc:
        logger.exception("OTP verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OTP service is temporarily unavailable. Please try again later.",
        )

    if not otp_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    user = User(
        email=normalized_email,
        full_name=payload.full_name.strip() if payload.full_name else None,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegisterResponse(message="Account created successfully", user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == normalized_email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token)
