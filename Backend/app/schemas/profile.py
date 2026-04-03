from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserProfileBase(BaseModel):
    headline: str | None = Field(default=None, max_length=160)
    college: str | None = Field(default=None, max_length=180)
    bio: str | None = Field(default=None, max_length=3000)
    skills: str | None = Field(default=None, max_length=2000)
    github_url: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=255)


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
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

