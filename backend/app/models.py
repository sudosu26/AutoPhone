"""Pydantic data models for PhonePilot API and task execution."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ApiError(BaseModel):
    """Standardized API error structure."""
    code: str
    message: str


class ApiResponse(BaseModel, Generic[T]):
    """Unified API response wrapper conforming to PhonePilot specification."""
    success: bool
    data: Optional[T] = None
    error: Optional[ApiError] = None
    request_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AdapterType(str, Enum):
    """Supported task execution adapters."""
    SHELL = "shell"
    HTTP = "http"
    APP_LAUNCH = "app_launch"
    FILE_OPS = "file_ops"


class ExecutionStatus(str, Enum):
    """Execution lifecycle states."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ==========================================
# Auth Models
# ==========================================

class LoginRequest(BaseModel):
    """Credentials login request."""
    username: str
    password: str


class TokenRequest(BaseModel):
    """Exchange API key or credentials for JWT token."""
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class TokenResponse(BaseModel):
    """JWT bearer token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """Payload decoded from JWT token."""
    sub: str
    actor_type: str = "user"
    exp: Optional[int] = None


# ==========================================
# Schedule Models
# ==========================================

class ScheduleCreate(BaseModel):
    """Create a new schedule for a task."""
    cron_expression: str
    enabled: bool = True


class ScheduleResponse(BaseModel):
    """Schedule details."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    cron_expression: str
    next_run: Optional[str] = None
    enabled: bool
    created_at: str


# ==========================================
# Task Models
# ==========================================

class TaskCreate(BaseModel):
    """Create a new task."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = ""
    task_type: str = "shell"
    adapter_type: AdapterType = AdapterType.SHELL
    config: Dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    cron_expression: Optional[str] = None  # Optional initial schedule


class TaskUpdate(BaseModel):
    """Update existing task properties."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    task_type: Optional[str] = None
    adapter_type: Optional[AdapterType] = None
    config: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


class TaskResponse(BaseModel):
    """Detailed task object with its schedules and last execution."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    task_type: str
    adapter_type: str
    config: Dict[str, Any]
    enabled: bool
    created_at: str
    updated_at: str
    schedules: List[ScheduleResponse] = Field(default_factory=list)
    last_execution: Optional["ExecutionResponse"] = None


# ==========================================
# Execution Models
# ==========================================

class ExecutionResponse(BaseModel):
    """Record of task run."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    status: ExecutionStatus
    started_at: str
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None


# Resolve circular reference
TaskResponse.model_rebuild()


# ==========================================
# Audit & History Models
# ==========================================

class AuditLogResponse(BaseModel):
    """Audit log entry."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: str
    action: str
    actor: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None


class DeviceStatusResponse(BaseModel):
    """Device status and connectivity metrics."""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    timestamp: str
    battery_level: Optional[float] = None
    is_charging: bool = False
    wifi_connected: bool = False
    tailscale_connected: bool = False
    uptime_seconds: int = 0


class SystemDiagnosticsResponse(BaseModel):
    """Host system diagnostics."""
    os: str
    python_version: str
    platform: str
    cpu_count: Optional[int] = None
    uptime_seconds: int
    memory: Dict[str, Any]
    disk: Dict[str, Any]
    engine: Dict[str, Any]
    scheduler: Dict[str, Any]
    database: Dict[str, Any]
