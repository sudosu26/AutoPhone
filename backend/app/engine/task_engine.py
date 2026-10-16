"""Core asynchronous task execution engine with retries, timeouts, and cancellation."""

import asyncio
import json
import logging
import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.config import settings
from app.database import db
from app.engine.registry import registry
from app.utils.logging import redact_sensitive_string

logger = logging.getLogger("phonepilot.engine")


class DuplicateExecutionError(Exception):
    """Raised when attempting to execute a task that is currently already executing."""
    pass


class TaskNotFoundError(Exception):
    """Raised when the specified task ID does not exist."""
    pass


class TaskEngine:
    """Manages lifecycle, asynchronous execution, cancellation, and metrics of tasks."""

    def __init__(self):
        # Maps execution_id -> asyncio.Task
        self._active_executions: Dict[str, asyncio.Task] = {}
        # Maps task_id -> execution_id for quick duplicate execution prevention
        self._active_tasks: Dict[str, str] = {}
        self._lock = asyncio.Lock()

    def is_task_running(self, task_id: str) -> bool:
        """Check if task is currently executing in memory."""
        return task_id in self._active_tasks

    async def cancel_execution(self, execution_id: str) -> bool:
        """Cancel an actively running task execution."""
        async with self._lock:
            task = self._active_executions.get(execution_id)
            if not task or task.done():
                return False

            task.cancel()
            return True

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel whatever execution is currently running for a given task ID."""
        execution_id = self._active_tasks.get(task_id)
        if not execution_id:
            return False
        return await self.cancel_execution(execution_id)

    async def execute_task(
        self,
        task_id: str,
        triggered_by: str = "manual",
        context_override: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Trigger task execution. Checks for duplicate running instances, creates execution record,
        enforces timeout and retry policies, and records result.
        """
        async with self._lock:
            # 1. Duplicate execution prevention check
            if task_id in self._active_tasks:
                raise DuplicateExecutionError(
                    f"Task {task_id} is already running in execution {self._active_tasks[task_id]}"
                )

            # Check in DB if there is a running execution marked for this task
            db_running = await db.fetch_one(
                "SELECT id FROM execution_records WHERE task_id = ? AND status = 'running'",
                (task_id,),
            )
            if db_running:
                raise DuplicateExecutionError(
                    f"Task {task_id} has an active running record in database ({db_running['id']})"
                )

            # 2. Fetch task from database
            task_row = await db.fetch_one("SELECT * FROM tasks WHERE id = ?", (task_id,))
            if not task_row:
                raise TaskNotFoundError(f"Task with id {task_id} does not exist.")

            execution_id = str(uuid.uuid4())
            self._active_tasks[task_id] = execution_id

        # 3. Create initial pending execution record in database
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.execute(
            """
            INSERT INTO execution_records (id, task_id, status, started_at, completed_at, result, error_message, duration_ms)
            VALUES (?, ?, 'pending', ?, NULL, NULL, NULL, NULL)
            """,
            (execution_id, task_id, now_iso),
        )

        # 4. Schedule asynchronous worker and track it
        async_task = asyncio.create_task(
            self._run_execution_worker(
                execution_id=execution_id,
                task_id=task_id,
                task_row=task_row,
                triggered_by=triggered_by,
                context_override=context_override or {},
            )
        )
        self._active_executions[execution_id] = async_task

        try:
            return await async_task
        finally:
            async with self._lock:
                self._active_executions.pop(execution_id, None)
                self._active_tasks.pop(task_id, None)

    async def _run_execution_worker(
        self,
        execution_id: str,
        task_id: str,
        task_row: Dict[str, Any],
        triggered_by: str,
        context_override: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Worker executing task logic with retries, timeout, and state tracking."""
        start_mono = time.perf_counter()
        started_iso = datetime.now(timezone.utc).isoformat()

        # Update status to running
        await db.execute(
            "UPDATE execution_records SET status = 'running', started_at = ? WHERE id = ?",
            (started_iso, execution_id),
        )

        try:
            raw_config = json.loads(task_row["config"]) if isinstance(task_row["config"], str) else task_row["config"]
        except Exception:
            raw_config = {}

        adapter_type = task_row["adapter_type"]
        adapter = registry.get(adapter_type)

        # Configurable timeout & retries
        cfg_timeout = float(raw_config.get("timeout_seconds", 60.0))
        effective_timeout = min(cfg_timeout, float(settings.phonepilot_max_task_timeout))
        max_retries = max(0, int(raw_config.get("max_retries", 0)))
        backoff_seconds = max(0.5, float(raw_config.get("backoff_seconds", 2.0)))

        context = {
            "execution_id": execution_id,
            "task_id": task_id,
            "task_name": task_row["name"],
            "triggered_by": triggered_by,
            **context_override,
        }

        attempt = 0
        final_result = None
        final_error = None
        status = "failed"

        while attempt <= max_retries:
            attempt += 1
            try:
                logger.info(
                    "Executing task %s (%s, attempt %d/%d)",
                    task_id,
                    adapter_type,
                    attempt,
                    max_retries + 1,
                )
                final_result = await asyncio.wait_for(
                    adapter.execute(raw_config, context),
                    timeout=effective_timeout,
                )
                status = "completed"
                final_error = None
                break  # Successful execution
            except asyncio.CancelledError:
                logger.warning("Task execution %s cancelled", execution_id)
                status = "cancelled"
                final_error = "Task execution was cancelled."
                break
            except asyncio.TimeoutError:
                final_error = f"Execution timed out after {effective_timeout} seconds (attempt {attempt})."
                logger.warning("Task %s attempt %d timed out: %s", task_id, attempt, final_error)
            except Exception as exc:
                tb_str = traceback.format_exc()
                final_error = redact_sensitive_string(f"{type(exc).__name__}: {str(exc)}\n{tb_str}")
                logger.warning("Task %s attempt %d failed: %s", task_id, attempt, exc)

            if attempt <= max_retries:
                sleep_duration = backoff_seconds * attempt
                logger.info("Backing off for %.2fs before retry...", sleep_duration)
                await asyncio.sleep(sleep_duration)

        duration_ms = int((time.perf_counter() - start_mono) * 1000)
        completed_iso = datetime.now(timezone.utc).isoformat()
        result_json = json.dumps(final_result) if final_result is not None else None

        await db.execute(
            """
            UPDATE execution_records
            SET status = ?, completed_at = ?, result = ?, error_message = ?, duration_ms = ?
            WHERE id = ?
            """,
            (status, completed_iso, result_json, final_error, duration_ms, execution_id),
        )

        return {
            "id": execution_id,
            "task_id": task_id,
            "status": status,
            "started_at": started_iso,
            "completed_at": completed_iso,
            "result": final_result,
            "error_message": final_error,
            "duration_ms": duration_ms,
        }


engine = TaskEngine()


def get_engine() -> TaskEngine:
    """Dependency provider for TaskEngine."""
    return engine
