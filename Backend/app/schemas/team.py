from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TeamCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    event_id: int
    member_ids: list[str] = Field(default_factory=list)


class TeamMemberResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    event_id: int
    leader_id: str
    created_at: datetime
    members: list[TeamMemberResponse]


class TeamInviteCreateResponse(BaseModel):
    team_id: int
    invite_token: str
    invite_path: str
    expires_at: datetime


class JoinTeamByInviteRequest(BaseModel):
    invite_token: str = Field(min_length=6, max_length=256)


class JoinTeamByInviteResponse(BaseModel):
    message: str
    team: TeamResponse
