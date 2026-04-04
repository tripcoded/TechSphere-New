import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_admin_api_key, require_completed_academic_profile
from app.models import Event, Team, TeamJoinRequest, TeamJoinRequestStatus, TeamMember, User
from app.profile_utils import has_completed_academic_profile
from app.schemas.team import (
    JoinTeamByInviteRequest,
    JoinTeamByInviteResponse,
    TeamCreateRequest,
    TeamInviteCreateResponse,
    TeamInviteEventResponse,
    TeamInvitePreviewResponse,
    TeamJoinRequestDecisionResponse,
    TeamJoinRequestResponse,
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


def _normalize_invite_token(value: str) -> str:
    token = value.strip()
    if not token:
        return ""

    if "invite=" in token:
        query = token.split("?", 1)[1] if "?" in token else token
        parsed_query = parse_qs(query)
        invite_values = parsed_query.get("invite")
        if invite_values and invite_values[0].strip():
            return invite_values[0].strip()

    if "/invite/" in token:
        return token.rsplit("/invite/", 1)[1].split("?", 1)[0].split("#", 1)[0].strip()

    parsed = urlparse(token)
    if parsed.scheme and parsed.netloc:
        invite_values = parse_qs(parsed.query).get("invite")
        if invite_values and invite_values[0].strip():
            return invite_values[0].strip()

        path_parts = [part for part in parsed.path.split("/") if part]
        for index, part in enumerate(path_parts):
            if part == "invite" and index + 1 < len(path_parts):
                return path_parts[index + 1].strip()

    return token


def _team_query():
    return select(Team).options(
        selectinload(Team.event),
        selectinload(Team.leader).selectinload(User.profile),
        selectinload(Team.members).selectinload(TeamMember.user).selectinload(User.profile),
        selectinload(Team.join_requests).selectinload(TeamJoinRequest.user),
    )


def _team_member_response_from_membership(membership: TeamMember) -> TeamMemberResponse:
    profile = membership.user.profile
    return TeamMemberResponse(
        id=membership.user.id,
        email=membership.user.email,
        full_name=membership.user.full_name,
        roll_no=profile.roll_no if profile else None,
        branch=profile.branch if profile else None,
        year=profile.year if profile else None,
        academic_profile_completed=has_completed_academic_profile(profile),
        github_url=profile.github_url if profile else None,
        linkedin_url=profile.linkedin_url if profile else None,
        portfolio_url=profile.portfolio_url if profile else None,
        joined_at=membership.joined_at,
    )


def _team_member_response_from_user(user: User) -> TeamMemberResponse:
    profile = user.profile
    return TeamMemberResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        roll_no=profile.roll_no if profile else None,
        branch=profile.branch if profile else None,
        year=profile.year if profile else None,
        academic_profile_completed=has_completed_academic_profile(profile),
        github_url=profile.github_url if profile else None,
        linkedin_url=profile.linkedin_url if profile else None,
        portfolio_url=profile.portfolio_url if profile else None,
        joined_at=None,
    )


def _build_team_response(team: Team) -> TeamResponse:
    ordered_memberships = sorted(team.members, key=lambda membership: membership.joined_at)
    members = [_team_member_response_from_membership(membership) for membership in ordered_memberships]
    leader = next((member for member in members if member.id == team.leader_id), None)

    if not leader and team.leader:
        leader = _team_member_response_from_user(team.leader)

    return TeamResponse(
        id=team.id,
        name=team.name,
        event_id=team.event_id,
        leader_id=team.leader_id,
        created_at=team.created_at,
        leader=leader,
        members=members,
    )


def _build_join_request_response(join_request: TeamJoinRequest) -> TeamJoinRequestResponse:
    return TeamJoinRequestResponse(
        id=join_request.id,
        team_id=join_request.team_id,
        team_name=join_request.team.name,
        event_id=join_request.team.event_id,
        event_title=join_request.team.event.title,
        requester=_team_member_response_from_user(join_request.user),
        status=join_request.status.value,
        requested_at=join_request.requested_at,
        reviewed_at=join_request.reviewed_at,
    )


def _get_invite_record(token: str) -> TeamInviteRecord:
    record = _INVITES.get(token)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite link is invalid")

    if datetime.now(timezone.utc) > record.expires_at:
        _INVITES.pop(token, None)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite link has expired")

    return record


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_completed_academic_profile),
):
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

    team = db.scalar(_team_query().where(Team.id == team.id))
    return _build_team_response(team)


@router.post("/{team_id}/invite", response_model=TeamInviteCreateResponse)
def create_team_invite(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_completed_academic_profile),
):
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


@router.get("/invite/{invite_token}", response_model=TeamInvitePreviewResponse)
def get_team_invite_preview(invite_token: str, db: Session = Depends(get_db)):
    token = _normalize_invite_token(invite_token)
    record = _get_invite_record(token)

    team = db.scalar(_team_query().where(Team.id == record.team_id))
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team no longer exists")

    return TeamInvitePreviewResponse(
        invite_token=token,
        expires_at=record.expires_at,
        event=TeamInviteEventResponse(
            id=team.event.id,
            title=team.event.title,
            description=team.event.description,
            location=team.event.location,
            starts_at=team.event.starts_at,
            ends_at=team.event.ends_at,
        ),
        team=_build_team_response(team),
    )


@router.post("/join-by-invite", response_model=JoinTeamByInviteResponse)
def join_team_by_invite(
    payload: JoinTeamByInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_completed_academic_profile),
):
    token = _normalize_invite_token(payload.invite_token)
    record = _get_invite_record(token)

    team = db.scalar(_team_query().where(Team.id == record.team_id))
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team no longer exists")

    if team.leader_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already the leader of this team")

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

    join_request = db.scalar(
        select(TeamJoinRequest).where(TeamJoinRequest.team_id == team.id, TeamJoinRequest.user_id == current_user.id)
    )

    if join_request and join_request.status == TeamJoinRequestStatus.pending:
        return JoinTeamByInviteResponse(message="Your join request is already pending approval", team=_build_team_response(team))

    if join_request:
        join_request.status = TeamJoinRequestStatus.pending
        join_request.requested_at = datetime.now(timezone.utc)
        join_request.reviewed_at = None
    else:
        join_request = TeamJoinRequest(
            team_id=team.id,
            user_id=current_user.id,
            status=TeamJoinRequestStatus.pending,
        )
        db.add(join_request)

    db.commit()

    team = db.scalar(_team_query().where(Team.id == team.id))
    return JoinTeamByInviteResponse(message="Join request sent to the team leader", team=_build_team_response(team))


@router.get("/leader/requests", response_model=list[TeamJoinRequestResponse])
def get_leader_join_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_completed_academic_profile),
):
    join_requests = db.scalars(
        select(TeamJoinRequest)
        .join(Team, Team.id == TeamJoinRequest.team_id)
        .where(Team.leader_id == current_user.id, TeamJoinRequest.status == TeamJoinRequestStatus.pending)
        .options(
            selectinload(TeamJoinRequest.user).selectinload(User.profile),
            selectinload(TeamJoinRequest.team).selectinload(Team.event),
        )
        .order_by(TeamJoinRequest.requested_at.desc())
    ).all()
    return [_build_join_request_response(join_request) for join_request in join_requests]


def _get_leader_request_or_404(db: Session, request_id: int, current_user: User) -> TeamJoinRequest:
    join_request = db.scalar(
        select(TeamJoinRequest)
        .join(Team, Team.id == TeamJoinRequest.team_id)
        .where(TeamJoinRequest.id == request_id, Team.leader_id == current_user.id)
        .options(
            selectinload(TeamJoinRequest.user).selectinload(User.profile),
            selectinload(TeamJoinRequest.team).selectinload(Team.event),
        )
    )
    if not join_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Join request not found")
    return join_request


@router.post("/requests/{request_id}/approve", response_model=TeamJoinRequestDecisionResponse)
def approve_join_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_completed_academic_profile),
):
    join_request = _get_leader_request_or_404(db, request_id, current_user)
    if join_request.status != TeamJoinRequestStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request is no longer pending")

    existing_in_team = db.scalar(
        select(TeamMember.id).where(TeamMember.team_id == join_request.team_id, TeamMember.user_id == join_request.user_id)
    )
    if not existing_in_team:
        existing_in_event = db.scalar(
            select(TeamMember.id)
            .join(Team, Team.id == TeamMember.team_id)
            .where(Team.event_id == join_request.team.event_id, TeamMember.user_id == join_request.user_id)
        )
        if existing_in_event:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This member already joined another team for the event",
            )
        db.add(TeamMember(team_id=join_request.team_id, user_id=join_request.user_id))

    join_request.status = TeamJoinRequestStatus.approved
    join_request.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    join_request = _get_leader_request_or_404(db, request_id, current_user)
    return TeamJoinRequestDecisionResponse(
        message="Join request approved",
        request=_build_join_request_response(join_request),
    )


@router.post("/requests/{request_id}/reject", response_model=TeamJoinRequestDecisionResponse)
def reject_join_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_completed_academic_profile),
):
    join_request = _get_leader_request_or_404(db, request_id, current_user)
    if join_request.status != TeamJoinRequestStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This request is no longer pending")

    join_request.status = TeamJoinRequestStatus.rejected
    join_request.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    join_request = _get_leader_request_or_404(db, request_id, current_user)
    return TeamJoinRequestDecisionResponse(
        message="Join request rejected",
        request=_build_join_request_response(join_request),
    )


@router.get("/my", response_model=list[TeamResponse])
def my_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_completed_academic_profile),
):
    teams = db.scalars(
        _team_query()
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.user_id == current_user.id)
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
        _team_query()
        .where(Team.event_id == event_id)
        .order_by(Team.created_at.asc())
    ).all()
    return [_build_team_response(team) for team in teams]
