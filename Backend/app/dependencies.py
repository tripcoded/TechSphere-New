import hmac

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User
from .profile_utils import has_completed_academic_profile
from .security import decode_access_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
ACADEMIC_PROFILE_REQUIRED_DETAIL = "Complete your academic profile to access team and event features."


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    user_id = decode_access_token(token)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_completed_academic_profile(current_user: User = Depends(get_current_user)) -> User:
    if not has_completed_academic_profile(current_user.profile):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ACADEMIC_PROFILE_REQUIRED_DETAIL,
        )
    return current_user


def require_admin_api_key(x_api_key: str = Header(default="", alias="X-API-Key")) -> None:
    if not settings.admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin API key is not configured",
        )

    if not hmac.compare_digest(x_api_key, settings.admin_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key",
        )
