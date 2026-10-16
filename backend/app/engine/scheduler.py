"""APScheduler-based job scheduler for automated task execution."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import db
from app.engine.task_engine import engine, DuplicateExecutionError

logger = logging.getLogger("phonepilot.scheduler")


class SchedulerService:
    """Manages recurring cron-based execution of PhonePilot tasks."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._is_running = False

    def is_running(self) -> bool:
        return self._is_running

    def get_job_count(self) -> int:
        """Return the number of active jobs in the scheduler."""
        return len(self.scheduler.get_jobs())

    def start(self) -> None:
        """Start the background scheduler."""
        if not self._is_running:
            self.scheduler.start()
            self._is_running = True
            logger.info("APScheduler service started successfully.")

    def shutdown(self) -> None:
        """Shutdown the scheduler."""
        if self._is_running:
            self.scheduler.shutdown(wait=False)
            self._is_running = False
            logger.info("APScheduler service stopped.")

    async def scheduled_task_runner(self, schedule_id: str, task_id: str) -> None:
        """Invoked when a scheduled job triggers."""
        logger.info("Scheduled trigger firing for task %s (schedule %s)", task_id, schedule_id)
        try:
            # Check if task is still enabled in DB
            task = await db.fetch_one("SELECT enabled FROM tasks WHERE id = ?", (task_id,))
            if not task or not bool(task["enabled"]):
                logger.info("Task %s is disabled or missing; skipping scheduled run.", task_id)
                return

            # Execute task
            await engine.execute_task(task_id=task_id, triggered_by="scheduler")

            # Update next_run timestamp in DB
            job = self.scheduler.get_job(schedule_id)
            if job and job.next_run_time:
                next_run_iso = job.next_run_time.isoformat()
                await db.execute(
                    "UPDATE task_schedules SET next_run = ? WHERE id = ?",
                    (next_run_iso, schedule_id),
                )
        except DuplicateExecutionError:
            logger.warning("Scheduled run for task %s skipped: already running.", task_id)
        except Exception as exc:
            logger.error("Error during scheduled execution for task %s: %s", task_id, exc)

    async def add_or_update_job(self, schedule_id: str, task_id: str, cron_expression: str) -> Optional[str]:
        """Add or update an active job in the scheduler."""
        try:
            trigger = CronTrigger.from_crontab(cron_expression)
        except Exception as exc:
            raise ValueError(f"Invalid cron expression '{cron_expression}': {exc}")

        # Remove existing job if present
        if self.scheduler.get_job(schedule_id):
            self.scheduler.remove_job(schedule_id)

        job = self.scheduler.add_job(
            self.scheduled_task_runner,
            trigger=trigger,
            id=schedule_id,
            args=[schedule_id, task_id],
            replace_existing=True,
            misfire_grace_time=300,
        )

        next_run_iso = job.next_run_time.isoformat() if job.next_run_time else None
        if next_run_iso:
            await db.execute(
                "UPDATE task_schedules SET next_run = ? WHERE id = ?",
                (next_run_iso, schedule_id),
            )
        return next_run_iso

    def remove_job(self, schedule_id: str) -> bool:
        """Remove a job from the scheduler."""
        if self.scheduler.get_job(schedule_id):
            self.scheduler.remove_job(schedule_id)
            logger.info("Removed job %s from scheduler", schedule_id)
            return True
        return False

    async def load_all_schedules(self) -> int:
        """Load and register all enabled task schedules from the database."""
        query = """
            SELECT s.id, s.task_id, s.cron_expression
            FROM task_schedules s
            JOIN tasks t ON s.task_id = t.id
            WHERE s.enabled = 1 AND t.enabled = 1
        """
        rows = await db.fetch_all(query)
        loaded = 0
        for row in rows:
            try:
                await self.add_or_update_job(
                    schedule_id=row["id"],
                    task_id=row["task_id"],
                    cron_expression=row["cron_expression"],
                )
                loaded += 1
            except Exception as e:
                logger.error("Failed to load schedule %s: %s", row["id"], e)
        logger.info("Loaded %d active schedules into APScheduler", loaded)
        return loaded

    def get_jobs_info(self) -> List[Dict[str, Any]]:
        """Return information on current scheduler jobs."""
        info = []
        for job in self.scheduler.get_jobs():
            info.append({
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            })
        return info


scheduler = SchedulerService()


def get_scheduler() -> SchedulerService:
    """Dependency provider for SchedulerService."""
    return scheduler
