"""Middleware for Request ID, Rate Limiting, and Structured Request Logging."""

import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Callable, Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings

logger = logging.getLogger("phonepilot.access")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Ensure every request has a unique X-Request-ID."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Respect client-provided request ID if present, otherwise generate one
        incoming_id = request.headers.get("X-Request-ID")
        req_id = incoming_id if incoming_id else str(uuid.uuid4())
        request.state.request_id = req_id

        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response


class RateLimiter:
    """Sliding-window in-memory rate limiter per client IP."""

    def __init__(self, limit: int = 100, window_seconds: int = 60):
        self.limit = limit
        self.window_seconds = window_seconds
        # client_id -> list of request timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup = 0.0

    def is_allowed(self, client_id: str) -> bool:
        now = time.monotonic()
        window_start = now - self.window_seconds

        if now - self._last_cleanup >= self.window_seconds:
            expired_clients = [
                key
                for key, timestamps in self.requests.items()
                if not timestamps or timestamps[-1] <= window_start
            ]
            for key in expired_clients:
                del self.requests[key]
            self._last_cleanup = now

        # Clean timestamps older than window
        timestamps = [t for t in self.requests[client_id] if t > window_start]
        if len(timestamps) >= self.limit:
            self.requests[client_id] = timestamps
            return False

        timestamps.append(now)
        self.requests[client_id] = timestamps
        return True

    def clear(self) -> None:
        """Reset rate limiter state (useful in tests)."""
        self.requests.clear()


rate_limiter = RateLimiter(limit=settings.phonepilot_rate_limit, window_seconds=60)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Enforce rate limiting per client IP."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Bypass rate limiting for health check endpoint
        if request.url.path == "/health":
            return await call_next(request)

        # Do not let callers choose their own rate-limit bucket via auth headers.
        client_id = request.client.host if request.client else "127.0.0.1"

        req_id = getattr(request.state, "request_id", str(uuid.uuid4()))

        if not rate_limiter.is_allowed(client_id):
            now_iso = datetime.now(timezone.utc).isoformat()
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "data": None,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit of {rate_limiter.limit} requests per minute exceeded.",
                    },
                    "request_id": req_id,
                    "timestamp": now_iso,
                },
                headers={
                    "Retry-After": "60",
                    "X-Request-ID": req_id,
                },
            )

        return await call_next(request)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log incoming HTTP requests with timing and request ID."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        req_id = getattr(request.state, "request_id", "unknown")

        try:
            response: Response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            extra_data = {
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else "unknown",
            }
            logger.info(
                f"{request.method} {request.url.path} {response.status_code} in {duration_ms}ms",
                extra={"request_id": req_id, "extra_data": extra_data},
            )
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"Unhandled exception during {request.method} {request.url.path}: {exc}",
                exc_info=True,
                extra={"request_id": req_id, "extra_data": {"path": request.url.path}},
            )
            raise exc
