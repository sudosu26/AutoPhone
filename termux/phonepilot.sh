#!/data/data/com.termux/files/usr/bin/bash
# One entry point for installing and running PhonePilot in Termux.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")"
PHONEPILOT_DIR="$HOME/phonepilot"
BACKEND_DIR="$PHONEPILOT_DIR/backend"
VENV_DIR="$PHONEPILOT_DIR/.venv"
LOG_DIR="$PHONEPILOT_DIR/logs"
SANDBOX_DIR="$PHONEPILOT_DIR/sandbox"
PID_FILE="$PHONEPILOT_DIR/phonepilot.pid"
INSTALLED_SCRIPT="$PHONEPILOT_DIR/phonepilot.sh"
REQUIREMENTS_STAMP="$PHONEPILOT_DIR/requirements.sha256"
COMMAND="${1:-run}"
FORCE_DEPENDENCY_INSTALL=0

log() { printf '[PhonePilot] %s\n' "$*"; }
error() { printf '[PhonePilot] ERROR: %s\n' "$*" >&2; }

is_phonepilot_process() {
    local pid="$1"
    local argument
    local -a arguments=()
    case "$pid" in
        ''|*[!0-9]*) return 1 ;;
    esac
    kill -0 "$pid" 2>/dev/null || return 1
    [ -r "/proc/$pid/cmdline" ] || return 1
    while IFS= read -r -d '' argument; do
        arguments+=("$argument")
    done < "/proc/$pid/cmdline"
    [ "${#arguments[@]}" -ge 2 ] || return 1
    case "${arguments[0]}" in
        *python*) ;;
        *) return 1 ;;
    esac
    for argument in "${arguments[@]}"; do
        [ "$argument" = "$BACKEND_DIR/run.py" ] && return 0
    done
    return 1
}

find_phonepilot_process() {
    local cmdline_file pid
    for cmdline_file in /proc/[0-9]*/cmdline; do
        [ -r "$cmdline_file" ] || continue
        pid="${cmdline_file#/proc/}"
        pid="${pid%/cmdline}"
        if is_phonepilot_process "$pid"; then
            printf '%s\n' "$pid"
            return 0
        fi
    done
    return 1
}

sync_backend() {
    local source_backend source_file relative destination
    source_backend="$SCRIPT_DIR/../backend"

    if [ ! -f "$source_backend/run.py" ] || [ ! -f "$source_backend/requirements.txt" ]; then
        if [ -f "$BACKEND_DIR/run.py" ] && [ -f "$BACKEND_DIR/requirements.txt" ]; then
            return
        fi
        error "Backend source not found. Keep this script beside the project's backend/ folder."
        exit 1
    fi

    mkdir -p "$BACKEND_DIR"
    while IFS= read -r -d '' source_file; do
        relative="${source_file#"$source_backend"/}"
        case "$relative" in
            .env|.env.*|*/.env|*/.env.*|*.db|*.db-*|*.pyc)
                continue
                ;;
        esac
        destination="$BACKEND_DIR/$relative"
        mkdir -p "$(dirname "$destination")"
        cp "$source_file" "$destination"
    done < <(
        find "$source_backend" \
            -type d \( -name .venv -o -name venv -o -name __pycache__ -o -name .pytest_cache -o -name .git \) -prune \
            -o -type f -print0
    )
}

install_phonepilot() {
    local missing_packages=()
    local python_version api_key source_env requirements_hash install_dependencies

    command -v pkg >/dev/null 2>&1 || {
        error "This script must be run inside Termux."
        exit 1
    }

    mkdir -p "$PHONEPILOT_DIR" "$LOG_DIR" "$SANDBOX_DIR"

    if ! command -v python3 >/dev/null 2>&1; then
        missing_packages+=(python python-bcrypt)
    elif ! python3 -c 'import bcrypt' >/dev/null 2>&1; then
        missing_packages+=(python-bcrypt)
    fi
    command -v curl >/dev/null 2>&1 || missing_packages+=(curl)
    command -v rustc >/dev/null 2>&1 || missing_packages+=(rust)
    command -v clang >/dev/null 2>&1 || missing_packages+=(clang)
    command -v make >/dev/null 2>&1 || missing_packages+=(make)
    command -v pkg-config >/dev/null 2>&1 || missing_packages+=(pkg-config)

    if [ "${#missing_packages[@]}" -gt 0 ]; then
        log "Installing required Termux packages: ${missing_packages[*]}"
        pkg update -y
        pkg install -y "${missing_packages[@]}"
    fi

    sync_backend

    python_version="$(python3 --version 2>&1)"
    log "Using $python_version"

    if [ ! -x "$VENV_DIR/bin/python" ]; then
        log "Creating Python environment..."
        python3 -m venv --system-site-packages "$VENV_DIR"
    elif ! grep -q '^include-system-site-packages = true$' "$VENV_DIR/pyvenv.cfg"; then
        log "Enabling prebuilt Termux Python packages in the virtual environment..."
        python3 -m venv --upgrade --system-site-packages "$VENV_DIR"
    fi

    requirements_hash="$("$VENV_DIR/bin/python" -c \
        'import hashlib, pathlib, sys; print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())' \
        "$BACKEND_DIR/requirements.txt")"
    install_dependencies=0
    if [ "$FORCE_DEPENDENCY_INSTALL" -eq 1 ] ||
        [ ! -f "$REQUIREMENTS_STAMP" ] ||
        [ "$(cat "$REQUIREMENTS_STAMP")" != "$requirements_hash" ] ||
        ! "$VENV_DIR/bin/python" -c 'import fastapi, uvicorn, pydantic, pydantic_settings, dotenv, aiosqlite, jwt, bcrypt, apscheduler, httpx, multipart' >/dev/null 2>&1; then
        install_dependencies=1
    fi

    if [ "$install_dependencies" -eq 1 ]; then
        log "Installing backend packages. The first pydantic-core Rust build may take several minutes."
        log "Build progress will be shown here. Keep Termux open until installation finishes."
        if ! CARGO_BUILD_JOBS=1 PIP_PROGRESS_BAR=on PIP_DISABLE_PIP_VERSION_CHECK=1 \
            "$VENV_DIR/bin/python" -m pip install \
            --prefer-binary --timeout 60 --retries 3 \
            -r "$BACKEND_DIR/requirements.txt"; then
            error "Dependency installation failed. Check the last pip/Rust error above and rerun this script."
            exit 1
        fi
        if ! "$VENV_DIR/bin/python" -c 'import fastapi, uvicorn, pydantic, pydantic_settings, dotenv, aiosqlite, jwt, bcrypt, apscheduler, httpx, multipart' >/dev/null; then
            error "A required Python package could not be imported after installation."
            exit 1
        fi
        printf '%s\n' "$requirements_hash" > "$REQUIREMENTS_STAMP"
    else
        log "Python dependencies are already installed; skipping the build step."
    fi

    source_env="$BACKEND_DIR/.env"
    if [ ! -f "$source_env" ]; then
        log "Creating private backend configuration..."
        api_key="$("$VENV_DIR/bin/python" -c 'import secrets; print("pp_live_" + secrets.token_hex(24))')"
        cat > "$source_env" <<EOF
PHONEPILOT_HOST=0.0.0.0
PHONEPILOT_PORT=8265
PHONEPILOT_DB_PATH=$PHONEPILOT_DIR/phonepilot.db
PHONEPILOT_LOG_LEVEL=INFO
PHONEPILOT_SECRET_KEY=$("$VENV_DIR/bin/python" -c 'import secrets; print(secrets.token_urlsafe(48))')
PHONEPILOT_API_KEY=$api_key
PHONEPILOT_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
PHONEPILOT_SANDBOX_DIR=$SANDBOX_DIR
PHONEPILOT_MAX_TASK_TIMEOUT=300
PHONEPILOT_RATE_LIMIT=100
EOF
        chmod 600 "$source_env"
        log "API key (save it securely; it will not be printed again): $api_key"
    fi

    if [ "$SCRIPT_PATH" != "$INSTALLED_SCRIPT" ]; then
        cp "$SCRIPT_PATH" "$INSTALLED_SCRIPT"
        chmod 700 "$INSTALLED_SCRIPT"
    fi

    log "Installation is ready."
}

serve() {
    [ -f "$BACKEND_DIR/run.py" ] || {
        error "Backend is not installed. Run: bash $SCRIPT_PATH install"
        exit 1
    }
    cd "$BACKEND_DIR"
    exec "$VENV_DIR/bin/python" "$BACKEND_DIR/run.py"
}

show_status() {
    local pid
    pid=""
    if [ -f "$PID_FILE" ]; then
        pid="$(cat "$PID_FILE")"
    fi
    if [ -n "$pid" ] && is_phonepilot_process "$pid"; then
        log "Backend process is running (PID $pid)."
    elif pid="$(find_phonepilot_process || true)" && [ -n "$pid" ]; then
        log "Backend process is running (PID $pid)."
    else
        log "No PhonePilot backend process was found."
    fi
    if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 3 http://127.0.0.1:8265/health; then
        printf '\n'
    else
        log "Health endpoint is not responding at http://127.0.0.1:8265/health"
    fi
}

stop_phonepilot() {
    local pid attempt
    pid=""
    if [ -f "$PID_FILE" ]; then
        pid="$(cat "$PID_FILE")"
    fi
    if [ -z "$pid" ] || ! is_phonepilot_process "$pid"; then
        pid="$(find_phonepilot_process || true)"
    fi
    if [ -z "$pid" ]; then
        rm -f "$PID_FILE"
        log "PhonePilot is not running."
        return
    fi

    log "Stopping PhonePilot (PID $pid)..."
    kill "$pid"
    for attempt in $(seq 1 10); do
        if ! is_phonepilot_process "$pid"; then
            rm -f "$PID_FILE"
            log "PhonePilot stopped."
            return
        fi
        sleep 1
    done
    error "Process $pid did not stop; use Android's app controls to close Termux if necessary."
    exit 1
}

case "$COMMAND" in
    install)
        FORCE_DEPENDENCY_INSTALL=1
        install_phonepilot
        ;;
    run)
        install_phonepilot
        if pid="$(find_phonepilot_process || true)" && [ -n "$pid" ]; then
            log "Already running (PID $pid). Use 'bash $SCRIPT_PATH status' to check it."
            exit 0
        fi
        log "Starting PhonePilot in this Termux session. Press Ctrl+C to stop."
        serve
        ;;
    start)
        install_phonepilot
        if pid="$(find_phonepilot_process || true)" && [ -n "$pid" ]; then
            log "Already running (PID $pid)."
            exit 0
        fi
        nohup bash "$INSTALLED_SCRIPT" _serve >> "$LOG_DIR/phonepilot.log" 2>&1 &
        pid=$!
        printf '%s\n' "$pid" > "$PID_FILE"
        for attempt in $(seq 1 30); do
            if curl -fsS --max-time 2 http://127.0.0.1:8265/health >/dev/null 2>&1; then
                log "PhonePilot is running (PID $pid)."
                log "API: http://127.0.0.1:8265  |  Docs: http://127.0.0.1:8265/docs"
                log "Logs: bash $INSTALLED_SCRIPT logs"
                exit 0
            fi
            if ! is_phonepilot_process "$pid"; then
                break
            fi
            sleep 1
        done
        error "Backend did not become healthy. Recent log output:"
        tail -30 "$LOG_DIR/phonepilot.log" 2>/dev/null || true
        exit 1
        ;;
    _serve)
        serve
        ;;
    stop)
        stop_phonepilot
        ;;
    status)
        show_status
        ;;
    logs)
        if [ -f "$LOG_DIR/phonepilot.log" ]; then
            tail -f "$LOG_DIR/phonepilot.log"
        else
            error "No backend log exists yet. Start PhonePilot first."
            exit 1
        fi
        ;;
    help|-h|--help)
        cat <<EOF
PhonePilot Termux runner

Usage: bash $SCRIPT_PATH [command]
  run      Install missing dependencies, then run in the foreground (default)
  start    Install missing dependencies and start in the background
  install  Force dependency installation without starting
  status   Show backend process and health
  stop     Stop the background backend
  logs     Follow the background backend log
EOF
        ;;
    *)
        error "Unknown command: $COMMAND"
        printf 'Run: bash %s help\n' "$SCRIPT_PATH" >&2
        exit 2
        ;;
esac
