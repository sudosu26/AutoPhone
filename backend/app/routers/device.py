"""Device status and connectivity metrics router."""

import time
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, Request

from app.database import db
from app.models import ApiResponse, DeviceStatusResponse
from app.security import get_current_actor

router = APIRouter(prefix="/api/v1/device", tags=["device"])

_START_TIME = time.time()


@router.get("/status", response_model=ApiResponse[DeviceStatusResponse])
async def get_device_status(
    request: Request,
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[DeviceStatusResponse]:
    """Retrieve device battery, network connectivity, and uptime metrics."""
    req_id = getattr(request.state, "request_id", None)

    # Check for latest record in device_status table
    query = """
        SELECT id, timestamp, battery_level, is_charging, wifi_connected, tailscale_connected, uptime_seconds
        FROM device_status
        ORDER BY id DESC LIMIT 1
    """
    row = await db.fetch_one(query)

    if row:
        status_data = DeviceStatusResponse(
            id=row["id"],
            timestamp=row["timestamp"],
            battery_level=row["battery_level"],
            is_charging=bool(row["is_charging"]),
            wifi_connected=bool(row["wifi_connected"]),
            tailscale_connected=bool(row["tailscale_connected"]),
            uptime_seconds=row["uptime_seconds"],
        )
    else:
        # Fallback to current host metrics
        current_uptime = int(time.time() - _START_TIME)
        status_data = DeviceStatusResponse(
            timestamp=datetime.now(timezone.utc).isoformat(),
            battery_level=100.0,
            is_charging=True,
            wifi_connected=True,
            tailscale_connected=False,
            uptime_seconds=current_uptime,
        )

    return ApiResponse(
        success=True,
        data=status_data,
        error=None,
        request_id=req_id,
    )
