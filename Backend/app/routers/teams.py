from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_admin_api_key
from app.models import Event, Team, TeamMember, User
from app.schemas.team import TeamCreateRequest, TeamMemberResponse, TeamResponse

router = APIRouter(prefix="/teams", tags=["Teams"])


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

