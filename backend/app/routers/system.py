"""System diagnostics router."""

import logging
import os
import platform
import shutil
import sys
import time
from typing import Any, Dict

from fastapi import APIRouter, Depends, Request

from app.config import settings
from app.database import db
from app.engine.scheduler import scheduler
from app.engine.task_engine import engine
from app.models import ApiResponse, SystemDiagnosticsResponse
from app.security import get_current_actor

logger = logging.getLogger("phonepilot.system")

router = APIRouter(prefix="/api/v1/system", tags=["system"])

_START_TIME = time.time()


@router.get("/diagnostics", response_model=ApiResponse[SystemDiagnosticsResponse])
async def get_diagnostics(
    request: Request,
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[SystemDiagnosticsResponse]:
    """Return comprehensive system diagnostics."""
    req_id = getattr(request.state, "request_id", None)

    uptime = int(time.time() - _START_TIME)

    # Memory info (best effort)
    memory_info: Dict[str, Any] = {}
    try:
        import resource
        usage = resource.getrusage(resource.RUSAGE_SELF)
        memory_info = {"max_rss_kb": usage.ru_maxrss}
    except (ImportError, Exception):
        try:
            import psutil
            proc = psutil.Process()
            mem = proc.memory_info()
            memory_info = {"rss_mb": round(mem.rss / (1024 * 1024), 2)}
        except (ImportError, Exception):
            memory_info = {"note": "Memory info unavailable"}

    # Disk info
    disk_info: Dict[str, Any] = {}
    try:
        usage = shutil.disk_usage(settings.phonepilot_db_path)
        disk_info = {
            "total_gb": round(usage.total / (1024 ** 3), 2),
            "used_gb": round(usage.used / (1024 ** 3), 2),
            "free_gb": round(usage.free / (1024 ** 3), 2),
            "usage_percent": round(usage.used / usage.total * 100, 1),
        }
    except Exception:
        disk_info = {"note": "Disk info unavailable"}

    # Database info
    db_info: Dict[str, Any] = {}
    try:
        db_size = os.path.getsize(settings.phonepilot_db_path)
        db_info["size_mb"] = round(db_size / (1024 * 1024), 2)
        await db.fetch_one("SELECT 1")
        db_info["status"] = "connected"

        # Count records
        task_count = await db.fetch_one("SELECT COUNT(*) as count FROM tasks")
        exec_count = await db.fetch_one("SELECT COUNT(*) as count FROM execution_records")
        error_count = await db.fetch_one(
            "SELECT COUNT(*) as count FROM execution_records WHERE status = 'failed' AND started_at > datetime('now', '-1 day')"
        )
        db_info["task_count"] = task_count["count"] if task_count else 0
        db_info["execution_count"] = exec_count["count"] if exec_count else 0
        db_info["errors_last_24h"] = error_count["count"] if error_count else 0
    except Exception as exc:
        db_info["status"] = f"error: {exc}"

    # Engine info
    engine_info: Dict[str, Any] = {
        "active_executions": len(engine._active_executions),
        "active_tasks": len(engine._active_tasks),
    }

    # Scheduler info
    scheduler_info: Dict[str, Any] = {
        "running": scheduler.is_running(),
        "job_count": scheduler.get_job_count(),
    }

    diagnostics = SystemDiagnosticsResponse(
        os=platform.platform(),
        python_version=sys.version,
        platform=platform.machine(),
        cpu_count=os.cpu_count(),
        uptime_seconds=uptime,
        memory=memory_info,
        disk=disk_info,
        engine=engine_info,
        scheduler=scheduler_info,
        database=db_info,
    )

    return ApiResponse(
        success=True,
        data=diagnostics,
        error=None,
        request_id=req_id,
    )
