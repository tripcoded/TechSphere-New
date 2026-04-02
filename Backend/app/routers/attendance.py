from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin_api_key
from app.models import Attendance, AttendanceStatus, Event, Team, TeamMember, User
from app.schemas.attendance import AttendanceMarkRequest, AttendanceResponse, AttendanceStatusEnum

router = APIRouter(prefix="/attendance", tags=["Attendance"], dependencies=[Depends(require_admin_api_key)])


def _to_response(record: Attendance) -> AttendanceResponse:
    return AttendanceResponse(
        event_id=record.event_id,
        user_id=record.user_id,
        status=AttendanceStatusEnum(record.status.value),
        updated_at=record.updated_at,
    )


@router.post("/mark", response_model=AttendanceResponse)
def mark_attendance(payload: AttendanceMarkRequest, db: Session = Depends(get_db)):
    event = db.get(Event, payload.event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    in_event_team = db.scalar(
        select(TeamMember.id)
        .join(Team, Team.id == TeamMember.team_id)
        .where(Team.event_id == payload.event_id, TeamMember.user_id == payload.user_id)
    )
    if not in_event_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not registered in any team for this event",
        )

    attendance = db.scalar(select(Attendance).where(Attendance.event_id == payload.event_id, Attendance.user_id == payload.user_id))
    status_value = AttendanceStatus.present if payload.status == AttendanceStatusEnum.present else AttendanceStatus.absent

    if attendance:
        attendance.status = status_value
        attendance.marked_by = "admin_api_key"
    else:
        attendance = Attendance(
            event_id=payload.event_id,
            user_id=payload.user_id,
            status=status_value,
            marked_by="admin_api_key",
        )
        db.add(attendance)

    db.commit()
    db.refresh(attendance)
    return _to_response(attendance)


@router.get("/event/{event_id}", response_model=list[AttendanceResponse])
def get_event_attendance(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    records = db.scalars(select(Attendance).where(Attendance.event_id == event_id).order_by(Attendance.user_id.asc())).all()
    return [_to_response(record) for record in records]

