# PhonePilot 🚀

**A complete, modular Android phone automation platform**

Control and automate your Android phone from both the device itself and your Windows PC, including over a private remote connection.

---

## What is PhonePilot?

PhonePilot is a unified platform for creating, executing, scheduling, monitoring, and managing automation tasks on your Android device. It provides:

- **Local control** from your Android phone via the native app
- **Remote control** from your Windows PC via the web dashboard
- **Private connectivity** through a Tailscale encrypted mesh network
- **Automated execution** of approved tasks on schedule
- **Recovery** and status reporting when tasks fail or the device restarts

> **Note:** PhonePilot works without root access. It respects Android's security model and clearly labels features that require additional permissions.

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────────┐
│  PC Dashboard │◄────►│   Tailscale   │◄────►│  Android Phone    │
│  (React/TS)   │      │   (VPN mesh)  │      │                   │
│  Port 5173    │      └──────────────┘      │  ┌──────────────┐ │
└──────────────┘                              │  │ PhonePilot   │ │
                                              │  │ Android App  │ │
                                              │  └──────────────┘ │
                                              │  ┌──────────────┐ │
                                              │  │ Termux       │ │
                                              │  │ ├─ FastAPI    │ │
                                              │  │ ├─ SQLite     │ │
                                              │  │ └─ SSH        │ │
                                              │  └──────────────┘ │
                                              └──────────────────┘
```

## Components

| Component | Technology | Location | Purpose |
|-----------|-----------|----------|---------|
| **Backend** | Python, FastAPI, SQLite | `backend/` | Task engine, REST API, data persistence |
| **Dashboard** | React, TypeScript, Vite | `dashboard/` | Web UI for PC-based control |
| **Android App** | Kotlin, Jetpack Compose | `android/` | Native phone UI and system integration |
| **Termux Scripts** | Bash | `termux/` | Phone-side setup, service management |
| **Documentation** | Markdown | `docs/` | Setup guides, security model, troubleshooting |

## Quick Start

### Prerequisites

- Android phone (Android 8.0+, no root required)
- Windows PC
- [Termux](https://f-droid.org/en/packages/com.termux/) installed from **F-Droid** (not Google Play)
- [Termux:Boot](https://f-droid.org/en/packages/com.termux.boot/) from F-Droid
- [Termux:API](https://f-droid.org/en/packages/com.termux.api/) from F-Droid
- [Tailscale](https://tailscale.com/) on both PC and phone (free account)

### Step 1: Set Up the Backend (on your phone in Termux)

Copy or clone the **whole project** onto your phone so both `termux/setup.sh`
and `backend/` are present. In Termux, change to the project directory and run:

```bash
bash termux/setup.sh

# Start PhonePilot
bash ~/phonepilot/start.sh

# Verify it's running
curl http://localhost:8265/health
```

Setup copies the project's `backend/` into `~/phonepilot/backend/` and creates
the start script at `~/phonepilot/start.sh`. SSH is optional; if OpenSSH is
unavailable, the backend can still run and be reached over the network.

### Step 2: Set Up the PC Dashboard (on your Windows PC)

```powershell
# Navigate to the dashboard directory
cd dashboard

# Install dependencies
npm install

# Configure the backend URL (edit .env or use Settings page)
# Default: http://localhost:8265

# Start the development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Step 3: Connect via Tailscale

1. Install Tailscale on both PC and phone
2. Sign in with the same account
3. Note the phone's Tailscale IP (100.x.y.z)
4. Update dashboard settings with the Tailscale IP
5. See [Tailscale Setup Guide](docs/tailscale-setup.md) for details

### Step 4: Install the Android App (optional)

```powershell
# Build requires JDK 17+ and Android Studio
cd android
./gradlew assembleDebug

# Install via ADB
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Development

### Backend Development

```powershell
cd backend

# Create virtual environment
py -3 -m venv venv

# Activate
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt -r requirements-dev.txt

# Run tests
python -m pytest tests/ -v

# Start server (development mode with auto-reload)
python run.py
```

### Dashboard Development

```powershell
cd dashboard

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Type checking
npx tsc --noEmit
```

### Android Development

Open the `android/` directory in Android Studio. Requires:
- JDK 17+
- Android SDK (platforms 35 or 36)
- Android Studio (recommended) or Gradle CLI

## API Documentation

When the backend is running, access the interactive API docs at:
- **Swagger UI:** http://localhost:8265/docs
- **ReDoc:** http://localhost:8265/redoc

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check (no auth) |
| `/api/v1/auth/token` | POST | Get authentication token |
| `/api/v1/tasks` | GET/POST | List/create tasks |
| `/api/v1/tasks/{id}` | GET/PUT/DELETE | Manage specific task |
| `/api/v1/tasks/{id}/run` | POST | Execute a task |
| `/api/v1/history` | GET | Execution history |
| `/api/v1/device/status` | GET | Device information |
| `/api/v1/system/diagnostics` | GET | System diagnostics |

## Automation Capabilities

### Tier 1: Basic Automation
- ✅ Launch applications
- ✅ Run approved shell commands (allowlisted)
- ✅ Create and manage scheduled tasks
- ✅ Manage files (in sandboxed directory)
- ✅ Execute HTTP requests
- ✅ Monitor device status

### Tier 2: UI Automation (requires Accessibility Service)
- ✅ Predefined UI workflows
- ✅ Element detection and interaction
- ✅ Configurable delays and failure handling
- ⚠️ Requires explicit user enablement in Settings

### Tier 3: System Integration
- ✅ Battery and connectivity diagnostics
- ✅ Background job scheduling (WorkManager)
- ✅ Boot recovery (Termux:Boot)
- ✅ Health monitoring
- ⚠️ Some features limited without root

## Security

PhonePilot is designed as a security-sensitive device management tool:

- 🔐 API key authentication on all endpoints
- 🛡️ Strict command allowlist (no arbitrary shell execution)
- 📁 Sandboxed file operations
- 📝 Complete audit logging
- 🔒 Encrypted remote access via Tailscale
- ❌ No default passwords or hardcoded secrets

See [Security Model](docs/security-model.md) for complete details.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design and component details |
| [Security Model](docs/security-model.md) | Threat model, auth, and protections |
| [Android Permissions](docs/android-permissions.md) | Permission matrix and compatibility |
| [Tailscale Setup](docs/tailscale-setup.md) | Remote connectivity guide |
| [Reboot & Recovery](docs/reboot-recovery.md) | Reliability and restart handling |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions |

## Project Structure

```
AutoPhone/
├── backend/          # Python FastAPI backend
│   ├── app/          # Application source code
│   │   ├── routers/  # API route handlers
│   │   ├── engine/   # Task execution engine
│   │   └── utils/    # Utility modules
│   ├── tests/        # Backend test suite
│   ├── migrations/   # Database schema
│   └── requirements.txt
├── dashboard/        # React/TypeScript web dashboard
│   ├── src/
│   │   ├── api/      # API client layer
│   │   ├── pages/    # Page components
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/    # React Query hooks
│   │   └── context/  # App state contexts
│   └── package.json
├── android/          # Native Android app
│   ├── app/src/main/java/com/phonepilot/app/
│   │   ├── ui/       # Compose screens
│   │   ├── data/     # API client, models
│   │   ├── viewmodel/ # ViewModels
│   │   └── service/  # Background services
│   └── build.gradle.kts
├── termux/           # Termux setup and management scripts
│   └── setup.sh
├── docs/             # Documentation
└── README.md         # This file
```

## Known Limitations

1. **No root access** — Some system-level operations are unavailable
2. **Background execution** — Android may kill background processes; PhonePilot uses WorkManager and Termux:Boot for best-effort recovery
3. **Accessibility Service** — UI automation requires the user to manually enable the service in Android Settings
4. **No HTTPS by default** — Encryption is provided by Tailscale; local network traffic is unencrypted
5. **Single user** — Designed for one person controlling their own device
6. **Android app requires JDK** — Compilation needs JDK 17+ and Android Studio

## License

This project is for personal use. All rights reserved.
