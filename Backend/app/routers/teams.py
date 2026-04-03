import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_admin_api_key
from app.models import Event, Team, TeamMember, User
from app.schemas.team import (
    JoinTeamByInviteRequest,
    JoinTeamByInviteResponse,
    TeamCreateRequest,
    TeamInviteCreateResponse,
    TeamMemberResponse,
    TeamResponse,
)

router = APIRouter(prefix="/teams", tags=["Teams"])


@dataclass
class TeamInviteRecord:
    team_id: int
    event_id: int
    expires_at: datetime


_INVITES: dict[str, TeamInviteRecord] = {}
_INVITE_TTL_HOURS = 72


def _build_team_response(team: Team) -> TeamResponse:
    members = []
    for membership in team.members:
        members.append(
            TeamMemberResponse(
                id=membership.user.id,
                email=membership.user.email,
                full_name=membership.user.full_name,
            )
        )

    return TeamResponse(
        id=team.id,
        name=team.name,
        event_id=team.event_id,
        leader_id=team.leader_id,
        created_at=team.created_at,
        members=members,
    )


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(payload: TeamCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    event = db.get(Event, payload.event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    member_ids = set(payload.member_ids or [])
    member_ids.add(current_user.id)

    users = db.scalars(select(User).where(User.id.in_(member_ids))).all()
    user_map = {user.id: user for user in users}
    if len(user_map) != len(member_ids):
        missing = sorted(member_ids - set(user_map))
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Users not found: {', '.join(missing)}")

    existing_member_rows = db.scalars(
        select(TeamMember.user_id).join(Team, Team.id == TeamMember.team_id).where(
            Team.event_id == payload.event_id,
            TeamMember.user_id.in_(member_ids),
        )
    ).all()
    if existing_member_rows:
        existing_members = ", ".join(sorted(set(existing_member_rows)))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Some members are already registered in a team for this event: {existing_members}",
        )

    team = Team(name=payload.name.strip(), event_id=payload.event_id, leader_id=current_user.id)
    db.add(team)
    db.flush()

    for member_id in member_ids:
        db.add(TeamMember(team_id=team.id, user_id=member_id))

    db.commit()
    db.refresh(team)

    team = db.scalar(
        select(Team)
        .where(Team.id == team.id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    return _build_team_response(team)


@router.post("/{team_id}/invite", response_model=TeamInviteCreateResponse)
def create_team_invite(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.scalar(select(Team).where(Team.id == team_id))
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    if team.leader_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the team leader can create invite links")

    token = secrets.token_urlsafe(18)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=_INVITE_TTL_HOURS)
    _INVITES[token] = TeamInviteRecord(team_id=team.id, event_id=team.event_id, expires_at=expires_at)

    return TeamInviteCreateResponse(
        team_id=team.id,
        invite_token=token,
        invite_path=f"/invite/{token}",
        expires_at=expires_at,
    )


@router.post("/join-by-invite", response_model=JoinTeamByInviteResponse)
def join_team_by_invite(
    payload: JoinTeamByInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = payload.invite_token.strip()
    record = _INVITES.get(token)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link is invalid")

    if datetime.now(timezone.utc) > record.expires_at:
        _INVITES.pop(token, None)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite link has expired")

    team = db.scalar(
        select(Team)
        .where(Team.id == record.team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team no longer exists")

    existing_in_team = db.scalar(
        select(TeamMember.id).where(TeamMember.team_id == team.id, TeamMember.user_id == current_user.id)
    )
    if existing_in_team:
        return JoinTeamByInviteResponse(message="You are already in this team", team=_build_team_response(team))

    existing_in_event = db.scalar(
        select(TeamMember.id).join(Team, Team.id == TeamMember.team_id).where(
            Team.event_id == team.event_id,
            TeamMember.user_id == current_user.id,
        )
    )
    if existing_in_event:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already registered in a team for this event",
        )

    membership = TeamMember(team_id=team.id, user_id=current_user.id)
    db.add(membership)
    db.commit()

    team = db.scalar(
        select(Team)
        .where(Team.id == team.id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    return JoinTeamByInviteResponse(message="You have joined the team", team=_build_team_response(team))


@router.get("/my", response_model=list[TeamResponse])
def my_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teams = db.scalars(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == current_user.id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .order_by(Team.created_at.desc())
    ).all()
    return [_build_team_response(team) for team in teams]


@router.get(
    "/event/{event_id}",
    response_model=list[TeamResponse],
    dependencies=[Depends(require_admin_api_key)],
)
def event_teams(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    teams = db.scalars(
        select(Team)
        .where(Team.event_id == event_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .order_by(Team.created_at.asc())
    ).all()
    return [_build_team_response(team) for team in teams]
