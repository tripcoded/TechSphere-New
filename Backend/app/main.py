from fastapi import FastAPI

from app.config import settings
from app.database import Base, engine
from app.routers.attendance import router as attendance_router
from app.routers.auth import router as auth_router
from app.routers.events import router as events_router
from app.routers.teams import router as teams_router

app = FastAPI(title=settings.app_name, debug=settings.app_debug)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


app.include_router(auth_router)
app.include_router(events_router)
app.include_router(teams_router)
app.include_router(attendance_router)

