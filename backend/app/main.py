"""PhonePilot FastAPI application entry point."""

import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import db
from app.engine.scheduler import scheduler
from app.engine.task_engine import engine
from app.middleware import LoggingMiddleware, RateLimitMiddleware, RequestIDMiddleware
from app.models import ApiResponse
from app.security import init_security_defaults
from app.utils.logging import setup_logging

logger = logging.getLogger("phonepilot.main")

_START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle manager."""
    # === STARTUP ===
    setup_logging(settings.phonepilot_log_level)
    logger.info("Starting PhonePilot backend v1.0.0...")

    # Run database migrations
    await db.run_migrations()
    logger.info("Database migrations applied.")

    # Initialize security defaults (API key hash, admin creds)
    await init_security_defaults()
    logger.info("Security defaults initialized.")

    # Recover interrupted executions from previous runs
    try:
        interrupted = await db.fetch_all(
            "SELECT id, task_id FROM execution_records WHERE status = 'running'"
        )
        for rec in interrupted:
            await db.execute(
                "UPDATE execution_records SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?",
                ("Interrupted by server restart", datetime.now(timezone.utc).isoformat(), rec["id"]),
            )
        if interrupted:
            logger.warning("Recovered %d interrupted executions from previous run.", len(interrupted))
    except Exception as exc:
        logger.error("Error recovering interrupted executions: %s", exc)

    # Start the scheduler
    scheduler.start()
    # Load existing schedules from database
    await scheduler.load_all_schedules()
    logger.info("Scheduler started.")

    # Log startup info
    logger.info(
        "PhonePilot backend ready on %s:%s",
        settings.phonepilot_host,
        settings.phonepilot_port,
    )
    if settings.phonepilot_api_key:
        masked_key = settings.phonepilot_api_key[:8] + "..." + settings.phonepilot_api_key[-4:]
        logger.info("API Key (masked): %s", masked_key)

    yield

    # === SHUTDOWN ===
    logger.info("Shutting down PhonePilot backend...")
    scheduler.shutdown()
    logger.info("Scheduler stopped.")
    logger.info("PhonePilot backend shut down gracefully.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="PhonePilot API",
        description="Android phone automation platform REST API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # Custom middleware (order matters: outermost first)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # Register routers
    from app.routers.health import router as health_router
    from app.routers.device import router as device_router
    from app.routers.tasks import router as tasks_router
    from app.routers.history import router as history_router
    from app.routers.system import router as system_router
    from app.routers.auth import router as auth_router

    app.include_router(health_router)
    app.include_router(device_router)
    app.include_router(tasks_router)
    app.include_router(history_router)
    app.include_router(system_router)
    app.include_router(auth_router)

    # Global exception handlers
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        req_id = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponse(
                success=False,
                data=None,
                error={"code": f"HTTP_{exc.status_code}", "message": exc.detail},
                request_id=req_id,
            ).model_dump(),
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        req_id = getattr(request.state, "request_id", None)
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content=ApiResponse(
                success=False,
                data=None,
                error={"code": "INTERNAL_ERROR", "message": "An internal server error occurred."},
                request_id=req_id,
            ).model_dump(),
        )

    return app


app = create_app()
