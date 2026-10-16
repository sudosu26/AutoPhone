"""API Routers Package."""

from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.tasks import router as tasks_router
from app.routers.history import router as history_router
from app.routers.device import router as device_router
from app.routers.system import router as system_router

__all__ = [
    "health_router",
    "auth_router",
    "tasks_router",
    "history_router",
    "device_router",
    "system_router",
]
