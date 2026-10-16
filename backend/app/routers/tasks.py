"""Task CRUD and execution management router."""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from apscheduler.triggers.cron import CronTrigger
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.database import db, record_audit
from app.engine.registry import registry
from app.engine.scheduler import scheduler
from app.engine.task_engine import DuplicateExecutionError, TaskNotFoundError, engine
from app.models import (
    ApiResponse,
    ExecutionResponse,
    ExecutionStatus,
    ScheduleResponse,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.security import get_current_actor

logger = logging.getLogger("phonepilot.tasks")

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


async def _build_task_response(task_row: Dict[str, Any]) -> TaskResponse:
    """Helper to reconstruct a complete TaskResponse with schedules and last execution."""
    task_id = task_row["id"]

    # Parse config json
    raw_cfg = task_row["config"]
    if isinstance(raw_cfg, str):
        try:
            cfg = json.loads(raw_cfg)
        except Exception:
            cfg = {}
    elif isinstance(raw_cfg, dict):
        cfg = raw_cfg
    else:
        cfg = {}

    # Fetch associated schedules
    schedules_rows = await db.fetch_all(
        "SELECT * FROM task_schedules WHERE task_id = ? ORDER BY created_at ASC",
        (task_id,),
    )
    schedules: List[ScheduleResponse] = [
        ScheduleResponse(
            id=s["id"],
            task_id=s["task_id"],
            cron_expression=s["cron_expression"],
            next_run=s["next_run"],
            enabled=bool(s["enabled"]),
            created_at=s["created_at"],
        )
        for s in schedules_rows
    ]

    # Fetch latest execution record
    last_exec_row = await db.fetch_one(
        "SELECT * FROM execution_records WHERE task_id = ? ORDER BY started_at DESC LIMIT 1",
        (task_id,),
    )
    last_execution: Optional[ExecutionResponse] = None
    if last_exec_row:
        res = last_exec_row["result"]
        if isinstance(res, str):
            try:
                res = json.loads(res)
            except Exception:
                pass

        try:
            status_enum = ExecutionStatus(last_exec_row["status"])
        except Exception:
            status_enum = ExecutionStatus.FAILED

        last_execution = ExecutionResponse(
            id=last_exec_row["id"],
            task_id=last_exec_row["task_id"],
            status=status_enum,
            started_at=last_exec_row["started_at"],
            completed_at=last_exec_row["completed_at"],
            result=res if isinstance(res, dict) else ({"value": res} if res is not None else None),
            error_message=last_exec_row["error_message"],
            duration_ms=last_exec_row["duration_ms"],
        )

    return TaskResponse(
        id=task_row["id"],
        name=task_row["name"],
        description=task_row["description"] or "",
        task_type=task_row["task_type"],
        adapter_type=task_row["adapter_type"],
        config=cfg,
        enabled=bool(task_row["enabled"]),
        created_at=task_row["created_at"],
        updated_at=task_row["updated_at"],
        schedules=schedules,
        last_execution=last_execution,
    )


async def _fetch_task_or_404(task_id: str) -> Dict[str, Any]:
    """Retrieve raw task row by ID or raise 404."""
    task = await db.fetch_one("SELECT * FROM tasks WHERE id = ?", (task_id,))
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id '{task_id}' was not found.",
        )
    return task


@router.get("", response_model=ApiResponse[List[TaskResponse]])
@router.get("/", response_model=ApiResponse[List[TaskResponse]])
async def list_tasks(
    request: Request,
    type: Optional[str] = Query(None, description="Filter by adapter or task type"),
    task_type: Optional[str] = Query(None, description="Filter by task_type"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled state"),
    search: Optional[str] = Query(None, description="Filter by task name or description"),
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[List[TaskResponse]]:
    """List all automation tasks with optional filtering."""
    req_id = getattr(request.state, "request_id", None)

    filter_type = type or task_type
    query = "SELECT * FROM tasks WHERE 1=1"
    params: List[Any] = []

    if filter_type:
        query += " AND (task_type = ? OR adapter_type = ?)"
        params.extend([filter_type, filter_type])

    if enabled is not None:
        query += " AND enabled = ?"
        params.append(1 if enabled else 0)

    if search:
        query += " AND (name LIKE ? OR description LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY created_at DESC"

    rows = await db.fetch_all(query, tuple(params))
    tasks: List[TaskResponse] = []
    for row in rows:
        tasks.append(await _build_task_response(row))

    return ApiResponse(
        success=True,
        data=tasks,
        error=None,
        request_id=req_id,
    )


@router.post("", response_model=ApiResponse[TaskResponse], status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ApiResponse[TaskResponse], status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    request: Request,
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[TaskResponse]:
    """Create a new automation task and configure optional recurrence."""
    req_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None

    # Validate adapter type exists
    adapter_str = (
        task_in.adapter_type.value
        if hasattr(task_in.adapter_type, "value")
        else str(task_in.adapter_type)
    )
    try:
        registry.validate_config(adapter_str, task_in.config)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuration error for adapter '{adapter_str}': {str(exc)}",
        )

    # Validate cron expression if provided
    if task_in.cron_expression:
        try:
            CronTrigger.from_crontab(task_in.cron_expression)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid cron expression '{task_in.cron_expression}': {str(exc)}",
            )

    task_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    config_json = json.dumps(task_in.config)

    insert_query = """
        INSERT INTO tasks (id, name, description, task_type, adapter_type, config, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    await db.execute(
        insert_query,
        (
            task_id,
            task_in.name,
            task_in.description or "",
            task_in.task_type or adapter_str,
            adapter_str,
            config_json,
            1 if task_in.enabled else 0,
            now_iso,
            now_iso,
        ),
    )

    # If cron schedule requested, register schedule
    if task_in.cron_expression:
        schedule_id = str(uuid.uuid4())
        await db.execute(
            """
            INSERT INTO task_schedules (id, task_id, cron_expression, next_run, enabled, created_at)
            VALUES (?, ?, ?, NULL, ?, ?)
            """,
            (schedule_id, task_id, task_in.cron_expression, 1 if task_in.enabled else 0, now_iso),
        )

        if task_in.enabled:
            try:
                await scheduler.add_or_update_job(
                    schedule_id=schedule_id,
                    task_id=task_id,
                    cron_expression=task_in.cron_expression,
                )
            except Exception as exc:
                logger.error("Failed to register schedule %s in scheduler: %s", schedule_id, exc)

    await record_audit(
        action="create_task",
        actor=actor.get("actor", "unknown"),
        resource_type="task",
        resource_id=task_id,
        details={"name": task_in.name, "adapter": adapter_str},
        ip_address=client_ip,
    )

    created_row = await _fetch_task_or_404(task_id)
    response_data = await _build_task_response(created_row)

    return ApiResponse(
        success=True,
        data=response_data,
        error=None,
        request_id=req_id,
    )


@router.get("/{task_id}", response_model=ApiResponse[TaskResponse])
async def get_task(
    task_id: str,
    request: Request,
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[TaskResponse]:
    """Retrieve full details of a specific task."""
    req_id = getattr(request.state, "request_id", None)
    task_row = await _fetch_task_or_404(task_id)
    response_data = await _build_task_response(task_row)

    return ApiResponse(
        success=True,
        data=response_data,
        error=None,
        request_id=req_id,
    )


@router.put("/{task_id}", response_model=ApiResponse[TaskResponse])
@router.patch("/{task_id}", response_model=ApiResponse[TaskResponse])
async def update_task(
    task_id: str,
    updates: TaskUpdate,
    request: Request,
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[TaskResponse]:
    """Update task configuration, name, description, or activation state."""
    req_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None
    existing = await _fetch_task_or_404(task_id)

    # Determine resulting adapter and config to validate
    new_adapter = (
        updates.adapter_type.value
        if updates.adapter_type and hasattr(updates.adapter_type, "value")
        else (str(updates.adapter_type) if updates.adapter_type else existing["adapter_type"])
    )

    if updates.config is not None:
        new_config = updates.config
    else:
        try:
            new_config = json.loads(existing["config"]) if isinstance(existing["config"], str) else existing["config"]
        except Exception:
            new_config = {}

    # Validate against registry
    try:
        registry.validate_config(new_adapter, new_config)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuration validation failed for adapter '{new_adapter}': {str(exc)}",
        )

    # Build update dynamic query
    fields: List[str] = []
    params: List[Any] = []

    if updates.name is not None:
        fields.append("name = ?")
        params.append(updates.name)

    if updates.description is not None:
        fields.append("description = ?")
        params.append(updates.description)

    if updates.task_type is not None:
        fields.append("task_type = ?")
        params.append(updates.task_type)

    if updates.adapter_type is not None:
        fields.append("adapter_type = ?")
        params.append(new_adapter)

    if updates.config is not None:
        fields.append("config = ?")
        params.append(json.dumps(new_config))

    if updates.enabled is not None:
        fields.append("enabled = ?")
        params.append(1 if updates.enabled else 0)

    now_iso = datetime.now(timezone.utc).isoformat()
    fields.append("updated_at = ?")
    params.append(now_iso)

    params.append(task_id)

    update_query = f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?"
    await db.execute(update_query, tuple(params))

    # Synchronize scheduler jobs if enabled status changed
    if updates.enabled is not None:
        schedules = await db.fetch_all(
            "SELECT id, cron_expression FROM task_schedules WHERE task_id = ?",
            (task_id,),
        )
        for sched in schedules:
            if not updates.enabled:
                scheduler.remove_job(sched["id"])
            else:
                try:
                    await scheduler.add_or_update_job(
                        sched["id"], task_id, sched["cron_expression"]
                    )
                except Exception as exc:
                    logger.error("Failed to re-register schedule %s: %s", sched["id"], exc)

    await record_audit(
        action="update_task",
        actor=actor.get("actor", "unknown"),
        resource_type="task",
        resource_id=task_id,
        details={"updated_fields": [f.split(" =")[0] for f in fields[:-1]]},
        ip_address=client_ip,
    )

    updated_row = await _fetch_task_or_404(task_id)
    response_data = await _build_task_response(updated_row)

    return ApiResponse(
        success=True,
        data=response_data,
        error=None,
        request_id=req_id,
    )


@router.delete("/{task_id}", response_model=ApiResponse[Dict[str, Any]])
async def delete_task(
    task_id: str,
    request: Request,
    confirm: bool = Query(True, description="Confirmation flag to delete task"),
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[Dict[str, Any]]:
    """Delete a task along with its schedules and execution history."""
    req_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None

    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task deletion was not confirmed (confirm=true required).",
        )

    task_row = await _fetch_task_or_404(task_id)

    # Cancel any running execution
    await engine.cancel_task(task_id)

    # Remove all active schedules from scheduler
    schedules = await db.fetch_all(
        "SELECT id FROM task_schedules WHERE task_id = ?",
        (task_id,),
    )
    for s in schedules:
        scheduler.remove_job(s["id"])

    # Delete from database (foreign keys cascade will handle schedules and executions)
    await db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))

    await record_audit(
        action="delete_task",
        actor=actor.get("actor", "unknown"),
        resource_type="task",
        resource_id=task_id,
        details={"name": task_row["name"]},
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data={
            "id": task_id,
            "deleted": True,
            "message": f"Task '{task_row['name']}' ({task_id}) deleted successfully.",
        },
        error=None,
        request_id=req_id,
    )


@router.post("/{task_id}/run", response_model=ApiResponse[Dict[str, Any]])
async def run_task(
    task_id: str,
    request: Request,
    payload: Optional[Dict[str, Any]] = None,
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[Dict[str, Any]]:
    """Trigger manual execution of a task."""
    req_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None

    await _fetch_task_or_404(task_id)

    context_override = payload.get("context", {}) if payload else {}

    try:
        result = await engine.execute_task(
            task_id=task_id,
            triggered_by=actor.get("actor", "manual"),
            context_override=context_override,
        )
    except DuplicateExecutionError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    except TaskNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    await record_audit(
        action="run_task",
        actor=actor.get("actor", "unknown"),
        resource_type="task",
        resource_id=task_id,
        details={"execution_id": result.get("id"), "status": result.get("status")},
        ip_address=client_ip,
    )

    return ApiResponse(
        success=result.get("status") == "completed",
        data=result,
        error=None,
        request_id=req_id,
    )


@router.post("/{task_id}/enable", response_model=ApiResponse[TaskResponse])
async def enable_task(
    task_id: str,
    request: Request,
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[TaskResponse]:
    """Enable a disabled task and activate its schedules."""
    req_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None

    await _fetch_task_or_404(task_id)
    now_iso = datetime.now(timezone.utc).isoformat()

    await db.execute(
        "UPDATE tasks SET enabled = 1, updated_at = ? WHERE id = ?",
        (now_iso, task_id),
    )

    # Re-activate schedules
    schedules = await db.fetch_all(
        "SELECT id, cron_expression FROM task_schedules WHERE task_id = ?",
        (task_id,),
    )
    for s in schedules:
        try:
            await scheduler.add_or_update_job(s["id"], task_id, s["cron_expression"])
        except Exception as exc:
            logger.error("Failed to restore schedule %s on enable: %s", s["id"], exc)

    await record_audit(
        action="enable_task",
        actor=actor.get("actor", "unknown"),
        resource_type="task",
        resource_id=task_id,
        ip_address=client_ip,
    )

    updated_row = await _fetch_task_or_404(task_id)
    return ApiResponse(
        success=True,
        data=await _build_task_response(updated_row),
        error=None,
        request_id=req_id,
    )


@router.post("/{task_id}/disable", response_model=ApiResponse[TaskResponse])
async def disable_task(
    task_id: str,
    request: Request,
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[TaskResponse]:
    """Disable an active task and pause its schedules."""
    req_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None

    await _fetch_task_or_404(task_id)
    now_iso = datetime.now(timezone.utc).isoformat()

    await db.execute(
        "UPDATE tasks SET enabled = 0, updated_at = ? WHERE id = ?",
        (now_iso, task_id),
    )

    # Remove schedules from active scheduler
    schedules = await db.fetch_all(
        "SELECT id FROM task_schedules WHERE task_id = ?",
        (task_id,),
    )
    for s in schedules:
        scheduler.remove_job(s["id"])

    await record_audit(
        action="disable_task",
        actor=actor.get("actor", "unknown"),
        resource_type="task",
        resource_id=task_id,
        ip_address=client_ip,
    )

    updated_row = await _fetch_task_or_404(task_id)
    return ApiResponse(
        success=True,
        data=await _build_task_response(updated_row),
        error=None,
        request_id=req_id,
    )


@router.post("/{task_id}/cancel", response_model=ApiResponse[Dict[str, Any]])
async def cancel_task_execution(
    task_id: str,
    request: Request,
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[Dict[str, Any]]:
    """Cancel currently running execution of a task."""
    req_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else None

    await _fetch_task_or_404(task_id)
    cancelled = await engine.cancel_task(task_id)

    await record_audit(
        action="cancel_task",
        actor=actor.get("actor", "unknown"),
        resource_type="task",
        resource_id=task_id,
        details={"cancelled": cancelled},
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data={
            "id": task_id,
            "cancelled": cancelled,
            "message": "Task execution cancelled successfully." if cancelled else "Task is not currently executing.",
        },
        error=None,
        request_id=req_id,
    )


@router.get("/{task_id}/executions", response_model=ApiResponse[List[ExecutionResponse]])
async def get_task_executions(
    task_id: str,
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    actor: Dict[str, Any] = Depends(get_current_actor),
) -> ApiResponse[List[ExecutionResponse]]:
    """Retrieve execution history specifically for this task."""
    req_id = getattr(request.state, "request_id", None)
    await _fetch_task_or_404(task_id)

    rows = await db.fetch_all(
        "SELECT * FROM execution_records WHERE task_id = ? ORDER BY started_at DESC LIMIT ?",
        (task_id, limit),
    )

    records: List[ExecutionResponse] = []
    for r in rows:
        res = r["result"]
        if isinstance(res, str):
            try:
                res = json.loads(res)
            except Exception:
                pass

        try:
            st = ExecutionStatus(r["status"])
        except Exception:
            st = ExecutionStatus.FAILED

        records.append(
            ExecutionResponse(
                id=r["id"],
                task_id=r["task_id"],
                status=st,
                started_at=r["started_at"],
                completed_at=r["completed_at"],
                result=res if isinstance(res, dict) else ({"value": res} if res is not None else None),
                error_message=r["error_message"],
                duration_ms=r["duration_ms"],
            )
        )

    return ApiResponse(
        success=True,
        data=records,
        error=None,
        request_id=req_id,
    )
