"""Health check endpoint."""

import time
from fastapi import APIRouter, Request
from app.database import db
from app.models import ApiResponse

router = APIRouter(tags=["health"])

_START_TIME = time.time()


@router.get("/health", response_model=ApiResponse)
async def get_health(request: Request) -> ApiResponse:
    """Public health check endpoint checking core services."""
    req_id = getattr(request.state, "request_id", None)

    db_status = "connected"
    try:
        await db.fetch_one("SELECT 1")
    except Exception as exc:
        db_status = f"unhealthy: {exc}"

    uptime = int(time.time() - _START_TIME)

    return ApiResponse(
        success=(db_status == "connected"),
        data={
            "status": "healthy" if db_status == "connected" else "degraded",
            "version": "1.0.0",
            "database": db_status,
            "uptime_seconds": uptime,
        },
        error=None,
        request_id=req_id,
    )
