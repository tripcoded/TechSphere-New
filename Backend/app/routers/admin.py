from fastapi import APIRouter, Depends

from app.dependencies import require_admin_api_key

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/validate", dependencies=[Depends(require_admin_api_key)])
def validate_admin_key():
    return {"ok": True}

