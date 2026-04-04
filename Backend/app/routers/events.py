from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin_api_key
from app.models import Event
from app.schemas.event import EventCreate, EventResponse, EventUpdate

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=list[EventResponse])
def list_events(db: Session = Depends(get_db)):
    events = db.scalars(select(Event).order_by(Event.starts_at.asc())).all()
    return events


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin_api_key)])
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    event = Event(
        title=payload.title.strip(),
        description=payload.description,
        location=payload.location,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventResponse, dependencies=[Depends(require_admin_api_key)])
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)

    starts_at = update_data.get("starts_at", event.starts_at)
    ends_at = update_data.get("ends_at", event.ends_at)
    if ends_at <= starts_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ends_at must be later than starts_at")

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin_api_key)])
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    db.delete(event)
    db.commit()
    return None
