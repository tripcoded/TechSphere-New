from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app import models  # noqa: F401
from app.schema_bootstrap import ensure_runtime_schema
from app.routers.attendance import router as attendance_router
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.events import router as events_router
from app.routers.profiles import router as profiles_router
from app.routers.teams import router as teams_router

app = FastAPI(title=settings.app_name, debug=settings.app_debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.on_event("startup")
def startup() -> None:
    if not settings.database_auto_schema_sync:
        return
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema(engine)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


app.include_router(auth_router)
app.include_router(events_router)
app.include_router(teams_router)
app.include_router(attendance_router)
app.include_router(admin_router)
app.include_router(profiles_router)
