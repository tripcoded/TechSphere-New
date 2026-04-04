from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.profile_utils import ACADEMIC_BRANCHES


class UserProfileBase(BaseModel):
    roll_no: str | None = Field(default=None, max_length=64)
    branch: str | None = Field(default=None, max_length=120)
    year: int | None = Field(default=None, ge=1, le=4)
    headline: str | None = Field(default=None, max_length=160)
    college: str | None = Field(default=None, max_length=180)
    bio: str | None = Field(default=None, max_length=3000)
    skills: str | None = Field(default=None, max_length=2000)
    github_url: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=255)
    portfolio_url: str | None = Field(default=None, max_length=255)

    @field_validator(
        "roll_no",
        "branch",
        "headline",
        "college",
        "bio",
        "skills",
        "github_url",
        "linkedin_url",
        "portfolio_url",
        mode="before",
    )
    @classmethod
    def normalize_optional_strings(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("branch")
    @classmethod
    def validate_branch(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in ACADEMIC_BRANCHES:
            raise ValueError(f"Branch must be one of: {', '.join(ACADEMIC_BRANCHES)}")
        return value


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    full_name: str | None
    email: EmailStr
    academic_profile_completed: bool
    updated_at: datetime


class AdminProfileBase(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    designation: str | None = Field(default=None, max_length=140)
    organization: str | None = Field(default=None, max_length=180)
    contact_email: EmailStr | None = None
    bio: str | None = Field(default=None, max_length=3000)


class AdminProfileUpdate(AdminProfileBase):
    pass


class AdminProfileResponse(AdminProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    updated_at: datetime
