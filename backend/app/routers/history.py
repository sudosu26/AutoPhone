"""Execution history router."""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request

from app.database import db
from app.models import ApiResponse, ExecutionResponse, ExecutionStatus
from app.security import get_current_actor

logger = logging.getLogger("phonepilot.history")

router = APIRouter(prefix="/api/v1", tags=["history"])


@router.get("/history", response_model=ApiResponse[Dict[str, Any]])
async def get_history(
    request: Request,
    limit: int = Query(25, ge=1, le=100, description="Number of records per page"),
    offset: int = Query(0, ge=0, description="Record offset for pagination"),
    status: Optional[str] = Query(None, description="Filter by execution status"),
    task_id: Optional[str] = Query(None, description="Filter by task ID"),
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[Dict[str, Any]]:
    """Retrieve paginated execution history with optional filters."""
    req_id = getattr(request.state, "request_id", None)

    query = """
        SELECT e.*, t.name as task_name
        FROM execution_records e
        LEFT JOIN tasks t ON e.task_id = t.id
        WHERE 1=1
    """
    params: List[Any] = []

    if status:
        query += " AND e.status = ?"
        params.append(status)

    if task_id:
        query += " AND e.task_id = ?"
        params.append(task_id)

    query += " ORDER BY e.started_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = await db.fetch_all(query, tuple(params))

    records = []
    for r in rows:
        result = r.get("result")
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except Exception:
                pass

        records.append({
            "id": r["id"],
            "task_id": r["task_id"],
            "task_name": r.get("task_name", "Unknown"),
            "status": r["status"],
            "started_at": r["started_at"],
            "completed_at": r.get("completed_at"),
            "result": result if isinstance(result, dict) else ({"value": result} if result is not None else None),
            "error_message": r.get("error_message"),
            "duration_ms": r.get("duration_ms"),
        })

    # Get total count for pagination
    count_query = "SELECT COUNT(*) as total FROM execution_records WHERE 1=1"
    count_params: List[Any] = []
    if status:
        count_query += " AND status = ?"
        count_params.append(status)
    if task_id:
        count_query += " AND task_id = ?"
        count_params.append(task_id)

    count_row = await db.fetch_one(count_query, tuple(count_params))
    total = count_row["total"] if count_row else 0

    return ApiResponse(
        success=True,
        data={
            "items": records,
            "records": records,
            "total": total,
            "limit": limit,
            "offset": offset,
        },
        error=None,
        request_id=req_id,
    )
