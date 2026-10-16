# PhonePilot Architecture

## System Overview

PhonePilot is a modular Android phone automation platform with five main components that communicate over HTTP and SSH.

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR WINDOWS PC                          │
│                                                             │
│  ┌─────────────────┐    ┌──────────────────────────┐       │
│  │   PC Dashboard   │◄──►│   Tailscale (VPN client)  │       │
│  │   (React/TS)     │    │   100.x.y.z              │       │
│  │   localhost:5173  │    └──────────┬───────────────┘       │
│  └────────┬─────────┘               │                       │
│           │ HTTP                     │ WireGuard tunnel      │
└───────────┼─────────────────────────┼───────────────────────┘
            │                         │
            │    ┌────────────────────┘
            │    │  (Encrypted mesh network)
            │    │
┌───────────┼────┼────────────────────────────────────────────┐
│           │    │        YOUR ANDROID PHONE                   │
│           ▼    ▼                                            │
│  ┌─────────────────┐                                       │
│  │   Tailscale      │ 100.x.y.z                             │
│  │   (VPN client)   │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│  ┌────────┼──────────────────────────────────────────┐      │
│  │ TERMUX │                                          │      │
│  │        ▼                                          │      │
│  │  ┌─────────────┐    ┌──────────────────────┐     │      │
│  │  │ SSH Server   │    │ PhonePilot Backend    │     │      │
│  │  │ (port 8022)  │    │ (FastAPI :8265)       │     │      │
│  │  └─────────────┘    │                      │     │      │
│  │                     │ ┌──────────────────┐ │     │      │
│  │                     │ │ Task Engine       │ │     │      │
│  │                     │ │ ├─ Scheduler      │ │     │      │
│  │                     │ │ ├─ Executor       │ │     │      │
│  │                     │ │ └─ Adapters       │ │     │      │
│  │                     │ └──────────────────┘ │     │      │
│  │                     │ ┌──────────────────┐ │     │      │
│  │                     │ │ SQLite Database   │ │     │      │
│  │                     │ └──────────────────┘ │     │      │
│  │                     └──────────────────────┘     │      │
│  └───────────────────────────────────────────────────┘      │
│                                                              │
│  ┌───────────────────────────────────────────────────┐      │
│  │ PHONEPILOT ANDROID APP                             │      │
│  │ (Kotlin / Jetpack Compose)                         │      │
│  │                                                    │      │
│  │  ┌────────────┐ ┌─────────────┐ ┌──────────────┐ │      │
│  │  │ Dashboard   │ │ Task Manager│ │ Settings     │ │      │
│  │  └────────────┘ └─────────────┘ └──────────────┘ │      │
│  │  ┌────────────┐ ┌─────────────┐ ┌──────────────┐ │      │
│  │  │ History    │ │ Diagnostics │ │ Permissions  │ │      │
│  │  └────────────┘ └─────────────┘ └──────────────┘ │      │
│  │                                                    │      │
│  │  Services: BootReceiver, WorkManager, Accessibility│      │
│  └───────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## Component Details

### A. Python Backend (FastAPI)

**Location:** `backend/`

**Purpose:** Central automation engine that receives commands, executes tasks, and stores results.

**Key modules:**
| Module | File | Purpose |
|--------|------|---------|
| API Server | `app/main.py` | FastAPI application with CORS, middleware, routers |
| Configuration | `app/config.py` | Environment-based settings via pydantic-settings |
| Authentication | `app/security.py` | API key and JWT authentication |
| Database | `app/database.py` | SQLite with async access, migrations |
| Task Engine | `app/engine/task_engine.py` | Async task executor with timeout/retry |
| Scheduler | `app/engine/scheduler.py` | Cron-based task scheduling |
| Task Registry | `app/engine/registry.py` | Allowlisted task types and adapters |
| Shell Adapter | `app/engine/adapters/shell.py` | Safe shell execution (allowlisted commands) |
| HTTP Adapter | `app/engine/adapters/http.py` | HTTP request execution |
| File Adapter | `app/engine/adapters/file_ops.py` | Sandboxed file operations |
| App Adapter | `app/engine/adapters/app_launch.py` | Application launcher |

**Communication:**
- Exposes REST API on port 8265
- Accepts JSON requests with API key authentication
- Returns consistent JSON responses
- OpenAPI docs at `/docs`

### B. PC Dashboard (React/TypeScript)

**Location:** `dashboard/`

**Purpose:** Web-based control interface for managing PhonePilot from your Windows PC.

**Key features:**
- Real-time device status display
- Task creation, editing, and monitoring
- Execution history with filtering
- System diagnostics
- Settings and configuration
- Dark/light theme

**Communication:**
- HTTP requests to backend API (configurable URL)
- Authenticated via API key stored in browser
- Auto-refresh polling (30s default)

### C. Android App (Kotlin/Compose)

**Location:** `android/`

**Purpose:** Native phone interface for on-device control and system integration.

**Architecture:** MVVM (Model-View-ViewModel)
- **View layer:** Jetpack Compose screens and components
- **ViewModel layer:** State management, business logic
- **Repository layer:** Data source abstraction
- **Data layer:** Retrofit API client, local storage

**Services:**
- **BootReceiver:** Starts health monitoring after device boot
- **HealthCheckWorker:** Periodic WorkManager job to verify backend
- **AccessibilityService:** UI automation (requires explicit user enablement)

### D. Termux Environment

**Location:** `termux/`

**Purpose:** Shell environment on Android where the Python backend runs.

**Components:**
- `setup.sh` — One-time installation and configuration
- `start.sh` / `stop.sh` / `status.sh` — Service management
- `healthcheck.sh` — Quick health verification
- Boot script for Termux:Boot auto-start
- SSH server for remote shell access

### E. Remote Connectivity (Tailscale)

**Purpose:** Private encrypted tunnel between PC and phone.

**How it works:**
1. Both devices join the same Tailscale network ("tailnet")
2. Tailscale assigns stable IPs (100.x.y.z range)
3. Traffic is encrypted end-to-end with WireGuard
4. No port forwarding or public IP needed

## Data Flow

### Creating and running a task

```
User (Dashboard/App)
    │
    ▼
POST /api/v1/tasks  ──► Authentication check
    │                         │
    ▼                         ▼
Input validation         Unauthorized → 401
    │
    ▼
Task stored in SQLite
    │
    ▼
POST /api/v1/tasks/{id}/run
    │
    ▼
Task Engine
    ├─ Validate task config
    ├─ Create execution record (status: running)
    ├─ Select adapter (shell/http/file/app)
    ├─ Execute with timeout
    ├─ Update execution record (completed/failed)
    └─ Log to audit trail
    │
    ▼
Response returned to client
```

### Scheduled task execution

```
Scheduler (APScheduler)
    │
    ├─ Checks task_schedules table
    ├─ Matches cron expressions against current time
    ├─ Submits matching tasks to Task Engine
    └─ Updates next_run timestamp
```

## API Endpoint Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/health` | No | Health check |
| POST | `/api/v1/auth/token` | API Key | Get JWT token |
| GET | `/api/v1/device/status` | Yes | Device information |
| GET | `/api/v1/tasks` | Yes | List all tasks |
| POST | `/api/v1/tasks` | Yes | Create task |
| GET | `/api/v1/tasks/{id}` | Yes | Get task details |
| PUT | `/api/v1/tasks/{id}` | Yes | Update task |
| DELETE | `/api/v1/tasks/{id}` | Yes | Delete task |
| POST | `/api/v1/tasks/{id}/run` | Yes | Execute task |
| POST | `/api/v1/tasks/{id}/enable` | Yes | Enable task |
| POST | `/api/v1/tasks/{id}/disable` | Yes | Disable task |
| POST | `/api/v1/tasks/{id}/cancel` | Yes | Cancel running task |
| GET | `/api/v1/history` | Yes | Execution history |
| GET | `/api/v1/system/diagnostics` | Yes | System diagnostics |

## Database Schema

```sql
-- Core tables
tasks              -- Automation task definitions
task_schedules     -- Cron schedules for tasks
execution_records  -- Task execution history
audit_log          -- Security audit trail
app_config         -- Application settings
device_status      -- Device status snapshots
```

## Security Architecture

```
Internet ──X──► (No direct exposure)

Tailscale Mesh ──► API (port 8265) ──► Authentication ──► Authorization ──► Execution
                                            │                   │
                                       API Key / JWT     Action Allowlist
                                                               │
                                                        ┌──────┴──────┐
                                                        │ Only these: │
                                                        │ - Allowlisted│
                                                        │   commands  │
                                                        │ - Sandboxed │
                                                        │   file ops  │
                                                        │ - Validated │
                                                        │   HTTP reqs │
                                                        └─────────────┘
```
