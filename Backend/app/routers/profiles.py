from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin_api_key
from app.models import AdminProfile, User, UserProfile
from app.schemas.profile import (
    AdminProfileResponse,
    AdminProfileUpdate,
    UserProfileResponse,
    UserProfileUpdate,
)

router = APIRouter(prefix="/profiles", tags=["Profiles"])


def _ensure_user_profile(db: Session, user: User) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if profile:
        return profile
    profile = UserProfile(user_id=user.id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def _ensure_admin_profile(db: Session) -> AdminProfile:
    profile = db.get(AdminProfile, 1)
    if profile:
        return profile
    profile = AdminProfile(id=1)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = _ensure_user_profile(db, current_user)
    return UserProfileResponse.model_validate(profile)


@router.put("/me", response_model=UserProfileResponse)
def update_my_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = _ensure_user_profile(db, current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return UserProfileResponse.model_validate(profile)


@router.get("/admin", response_model=AdminProfileResponse, dependencies=[Depends(require_admin_api_key)])
def get_admin_profile(db: Session = Depends(get_db)):
    profile = _ensure_admin_profile(db)
    return AdminProfileResponse.model_validate(profile)


@router.put("/admin", response_model=AdminProfileResponse, dependencies=[Depends(require_admin_api_key)])
def update_admin_profile(payload: AdminProfileUpdate, db: Session = Depends(get_db)):
    profile = _ensure_admin_profile(db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return AdminProfileResponse.model_validate(profile)
