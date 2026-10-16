#!/data/data/com.termux/files/usr/bin/bash
# PhonePilot - Termux Setup Script
# Run this script in Termux on your Android device to set up the automation backend.
#
# Usage: bash setup.sh
#
# Prerequisites:
#   - Termux installed from F-Droid (NOT Google Play - that version is outdated)
#   - Termux:Boot installed from F-Droid (for startup scripts)
#   - Internet connection

set -euo pipefail

PHONEPILOT_DIR="$HOME/phonepilot"
VENV_DIR="$PHONEPILOT_DIR/.venv"
LOG_DIR="$PHONEPILOT_DIR/logs"
CONFIG_DIR="$PHONEPILOT_DIR/config"
SANDBOX_DIR="$PHONEPILOT_DIR/sandbox"
BOOT_DIR="$HOME/.termux/boot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "============================================"
echo "  PhonePilot - Termux Setup"
echo "============================================"
echo ""

# -----------------------------------------------------------
# Step 1: Update packages
# -----------------------------------------------------------
log_info "Updating Termux packages..."
pkg update -y && pkg upgrade -y
log_success "Packages updated."

# -----------------------------------------------------------
# Step 2: Install required packages
# -----------------------------------------------------------
log_info "Installing required packages..."
pkg install -y python openssh git curl termux-api jq

# Verify Python
PYTHON_VERSION=$(python3 --version 2>&1)
log_success "Python installed: $PYTHON_VERSION"

# Verify SSH
SSHD_PATH=$(which sshd 2>/dev/null || echo "not found")
if [ "$SSHD_PATH" != "not found" ]; then
    log_success "SSH server available at: $SSHD_PATH"
else
    log_error "SSH server not found. Install openssh: pkg install openssh"
    exit 1
fi

# -----------------------------------------------------------
# Step 3: Create directory structure
# -----------------------------------------------------------
log_info "Creating project directories..."
mkdir -p "$PHONEPILOT_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p "$SANDBOX_DIR"
mkdir -p "$BOOT_DIR"
log_success "Directories created."

# -----------------------------------------------------------
# Step 4: Copy or clone backend code
# -----------------------------------------------------------
if [ -d "$PHONEPILOT_DIR/backend" ]; then
    log_info "Backend directory already exists. Skipping copy."
else
    log_info "Backend code should be copied to: $PHONEPILOT_DIR/backend/"
    log_info "You can use SCP, Git, or direct copy."
    log_info ""
    log_info "Option 1 - SCP from PC (replace <PC_IP>):"
    log_info "  scp -r <PC_IP>:path/to/AutoPhone/backend $PHONEPILOT_DIR/backend"
    log_info ""
    log_info "Option 2 - Git clone (if pushed to a repo):"
    log_info "  git clone <your-repo-url> $PHONEPILOT_DIR/repo"
    log_info "  cp -r $PHONEPILOT_DIR/repo/backend $PHONEPILOT_DIR/backend"
    log_info ""
    mkdir -p "$PHONEPILOT_DIR/backend"
fi

# -----------------------------------------------------------
# Step 5: Create Python virtual environment
# -----------------------------------------------------------
log_info "Creating Python virtual environment..."
if [ -d "$VENV_DIR" ]; then
    log_info "Virtual environment already exists. Skipping creation."
else
    python3 -m venv "$VENV_DIR"
    log_success "Virtual environment created at: $VENV_DIR"
fi

# Activate and install dependencies
log_info "Installing Python dependencies..."
source "$VENV_DIR/bin/activate"
pip install --upgrade pip

if [ -f "$PHONEPILOT_DIR/backend/requirements.txt" ]; then
    pip install -r "$PHONEPILOT_DIR/backend/requirements.txt"
    log_success "Dependencies installed."
else
    log_warn "requirements.txt not found. Install manually after copying backend code."
    log_info "  pip install fastapi uvicorn pydantic pydantic-settings aiosqlite python-jose[cryptography] passlib[bcrypt] python-multipart apscheduler httpx"
fi
deactivate

# -----------------------------------------------------------
# Step 6: Generate environment configuration
# -----------------------------------------------------------
ENV_FILE="$PHONEPILOT_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    log_info "Generating environment configuration..."
    
    # Generate random secret key and API key
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    API_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    
    cat > "$ENV_FILE" << EOF
# PhonePilot Configuration
# Generated on $(date -Iseconds)
# WARNING: Keep this file secret. Do not commit to version control.

PHONEPILOT_HOST=0.0.0.0
PHONEPILOT_PORT=8265
PHONEPILOT_DB_PATH=$PHONEPILOT_DIR/phonepilot.db
PHONEPILOT_LOG_LEVEL=INFO
PHONEPILOT_SECRET_KEY=$SECRET_KEY
PHONEPILOT_API_KEY=$API_KEY
PHONEPILOT_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
PHONEPILOT_SANDBOX_DIR=$SANDBOX_DIR
PHONEPILOT_MAX_TASK_TIMEOUT=300
PHONEPILOT_RATE_LIMIT=100
EOF
    
    chmod 600 "$ENV_FILE"
    log_success "Environment config created at: $ENV_FILE"
    echo ""
    log_info "YOUR API KEY (save this securely):"
    echo -e "${GREEN}  $API_KEY${NC}"
    echo ""
    log_warn "This key will not be shown again. Save it now!"
else
    log_info "Environment config already exists. Skipping."
fi

# -----------------------------------------------------------
# Step 7: Configure SSH
# -----------------------------------------------------------
log_info "Configuring SSH server..."

SSH_DIR="$HOME/.ssh"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

AUTHORIZED_KEYS="$SSH_DIR/authorized_keys"
if [ ! -f "$AUTHORIZED_KEYS" ]; then
    touch "$AUTHORIZED_KEYS"
    chmod 600 "$AUTHORIZED_KEYS"
    log_info "Created authorized_keys file."
    log_info ""
    log_info "To enable SSH key authentication from your PC:"
    log_info "  1. On your PC, generate a key: ssh-keygen -t ed25519"
    log_info "  2. Copy the public key from: C:\\Users\\<you>\\.ssh\\id_ed25519.pub"
    log_info "  3. Paste it into: $AUTHORIZED_KEYS"
    log_info ""
fi

# Generate host key if needed
if [ ! -f "$HOME/.ssh/ssh_host_ed25519_key" ]; then
    ssh-keygen -t ed25519 -f "$HOME/.ssh/ssh_host_ed25519_key" -N "" -q
    log_success "SSH host key generated."
fi

# Set SSH password (Termux uses single user)
log_info "Setting SSH password for Termux..."
log_info "You will be prompted to enter a password for SSH access."
log_info "If you prefer key-only auth, you can skip this and use authorized_keys."
echo ""
log_info "Run 'passwd' manually to set your Termux password."
echo ""

# Print SSH info
TERMUX_SSH_PORT=8022
log_info "SSH Configuration:"
log_info "  Port: $TERMUX_SSH_PORT"
log_info "  Start SSH: sshd"
log_info "  Connect from PC: ssh -p $TERMUX_SSH_PORT $(whoami)@<phone-ip>"
log_info "  With Tailscale:  ssh -p $TERMUX_SSH_PORT $(whoami)@<tailscale-ip>"

# -----------------------------------------------------------
# Step 8: Create startup script for Termux:Boot
# -----------------------------------------------------------
log_info "Creating Termux:Boot startup script..."

cat > "$BOOT_DIR/phonepilot-start.sh" << 'BOOTEOF'
#!/data/data/com.termux/files/usr/bin/bash
# PhonePilot Termux:Boot startup script
# This runs automatically when the device boots (if Termux:Boot is installed)

PHONEPILOT_DIR="$HOME/phonepilot"
VENV_DIR="$PHONEPILOT_DIR/.venv"
LOG_DIR="$PHONEPILOT_DIR/logs"
PID_FILE="$PHONEPILOT_DIR/phonepilot.pid"

# Wait for network to be available
sleep 10

# Start SSH server
sshd 2>/dev/null

# Start PhonePilot backend
if [ -f "$VENV_DIR/bin/activate" ] && [ -f "$PHONEPILOT_DIR/backend/run.py" ]; then
    source "$VENV_DIR/bin/activate"
    cd "$PHONEPILOT_DIR/backend"
    
    # Kill existing process if running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        kill "$OLD_PID" 2>/dev/null || true
        rm -f "$PID_FILE"
    fi
    
    # Start backend in background
    nohup python run.py >> "$LOG_DIR/phonepilot-boot.log" 2>&1 &
    echo $! > "$PID_FILE"
    
    echo "[$(date -Iseconds)] PhonePilot started (PID: $(cat $PID_FILE))" >> "$LOG_DIR/boot.log"
fi
BOOTEOF

chmod 700 "$BOOT_DIR/phonepilot-start.sh"
log_success "Boot startup script created."

# -----------------------------------------------------------
# Step 9: Create management scripts
# -----------------------------------------------------------
log_info "Creating management scripts..."

# Start script
cat > "$PHONEPILOT_DIR/start.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Start PhonePilot backend
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$SCRIPT_DIR/phonepilot.pid"

mkdir -p "$LOG_DIR"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "PhonePilot is already running (PID: $PID)"
        exit 0
    fi
    rm -f "$PID_FILE"
fi

# Activate venv and start
source "$VENV_DIR/bin/activate"
cd "$SCRIPT_DIR/backend"

echo "Starting PhonePilot backend..."
nohup python run.py >> "$LOG_DIR/phonepilot.log" 2>&1 &
PID=$!
echo $PID > "$PID_FILE"

sleep 2

if kill -0 "$PID" 2>/dev/null; then
    echo "PhonePilot started successfully (PID: $PID)"
    echo "API: http://localhost:8265"
    echo "Docs: http://localhost:8265/docs"
    echo "Logs: tail -f $LOG_DIR/phonepilot.log"
else
    echo "ERROR: PhonePilot failed to start. Check logs:"
    echo "  tail -20 $LOG_DIR/phonepilot.log"
    rm -f "$PID_FILE"
    exit 1
fi
EOF

# Stop script
cat > "$PHONEPILOT_DIR/stop.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Stop PhonePilot backend
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/phonepilot.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "PhonePilot is not running (no PID file)."
    exit 0
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping PhonePilot (PID: $PID)..."
    kill "$PID"
    
    # Wait for graceful shutdown
    for i in $(seq 1 10); do
        if ! kill -0 "$PID" 2>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # Force kill if still running
    if kill -0 "$PID" 2>/dev/null; then
        echo "Force killing PhonePilot..."
        kill -9 "$PID" 2>/dev/null || true
    fi
    
    echo "PhonePilot stopped."
else
    echo "PhonePilot process not found (stale PID file)."
fi

rm -f "$PID_FILE"
EOF

# Status script
cat > "$PHONEPILOT_DIR/status.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Check PhonePilot status
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/phonepilot.pid"
LOG_DIR="$SCRIPT_DIR/logs"

echo "============================================"
echo "  PhonePilot Status Check"
echo "============================================"
echo ""

# Backend process
echo "--- Backend ---"
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "  Status: RUNNING (PID: $PID)"
    else
        echo "  Status: STOPPED (stale PID file)"
    fi
else
    echo "  Status: STOPPED"
fi

# Health check
echo ""
echo "--- Health Check ---"
HEALTH=$(curl -s -m 5 http://localhost:8265/health 2>/dev/null || echo "UNREACHABLE")
echo "  Response: $HEALTH"

# SSH
echo ""
echo "--- SSH ---"
if pgrep -x sshd > /dev/null 2>&1; then
    echo "  Status: RUNNING"
    echo "  Port: 8022"
else
    echo "  Status: STOPPED"
    echo "  Start with: sshd"
fi

# Network
echo ""
echo "--- Network ---"
IP_WLAN=$(ip -4 addr show wlan0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "N/A")
echo "  WiFi IP: $IP_WLAN"

IP_TAILSCALE=$(ip -4 addr show tailscale0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "Not connected")
echo "  Tailscale IP: $IP_TAILSCALE"

# Battery
echo ""
echo "--- Battery ---"
if command -v termux-battery-status &>/dev/null; then
    BATTERY=$(termux-battery-status 2>/dev/null || echo '{"percentage": "N/A"}')
    echo "  $BATTERY" | jq -r '"  Level: \(.percentage)%  Status: \(.status)  Plugged: \(.plugged)"' 2>/dev/null || echo "  $BATTERY"
else
    echo "  termux-api not available"
fi

# Disk
echo ""
echo "--- Storage ---"
df -h "$HOME" 2>/dev/null | tail -1 | awk '{print "  Used: "$3"  Available: "$4"  Usage: "$5}'

# Logs
echo ""
echo "--- Recent Logs ---"
if [ -f "$LOG_DIR/phonepilot.log" ]; then
    tail -5 "$LOG_DIR/phonepilot.log"
else
    echo "  No log file found."
fi

echo ""
echo "============================================"
EOF

# Health check script
cat > "$PHONEPILOT_DIR/healthcheck.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Quick health check for monitoring
RESPONSE=$(curl -s -m 5 -o /dev/null -w "%{http_code}" http://localhost:8265/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    echo "HEALTHY"
    exit 0
else
    echo "UNHEALTHY (HTTP $RESPONSE)"
    exit 1
fi
EOF

chmod 700 "$PHONEPILOT_DIR/start.sh"
chmod 700 "$PHONEPILOT_DIR/stop.sh"
chmod 700 "$PHONEPILOT_DIR/status.sh"
chmod 700 "$PHONEPILOT_DIR/healthcheck.sh"
log_success "Management scripts created."

# -----------------------------------------------------------
# Step 10: Create Termux properties
# -----------------------------------------------------------
TERMUX_PROPS_DIR="$HOME/.termux"
mkdir -p "$TERMUX_PROPS_DIR"

if [ ! -f "$TERMUX_PROPS_DIR/termux.properties" ]; then
    cat > "$TERMUX_PROPS_DIR/termux.properties" << 'EOF'
# PhonePilot Termux properties
# Allow external apps to run Termux commands (required for boot scripts)
allow-external-apps = true
EOF
    log_success "Termux properties configured."
fi

# -----------------------------------------------------------
# Summary
# -----------------------------------------------------------
echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
log_success "PhonePilot directory:  $PHONEPILOT_DIR"
log_success "Virtual environment:   $VENV_DIR"
log_success "Log directory:         $LOG_DIR"
log_success "Sandbox directory:     $SANDBOX_DIR"
log_success "Boot script:           $BOOT_DIR/phonepilot-start.sh"
echo ""
echo "Next steps:"
echo "  1. Copy backend code to: $PHONEPILOT_DIR/backend/"
echo "  2. Install dependencies:  source $VENV_DIR/bin/activate && pip install -r $PHONEPILOT_DIR/backend/requirements.txt"
echo "  3. Start PhonePilot:      bash $PHONEPILOT_DIR/start.sh"
echo "  4. Check status:          bash $PHONEPILOT_DIR/status.sh"
echo "  5. Set up SSH password:   passwd"
echo "  6. Start SSH:             sshd"
echo "  7. Install Tailscale:     See docs/tailscale-setup.md"
echo ""
echo "Access from PC:"
echo "  API:   http://<phone-ip>:8265"
echo "  SSH:   ssh -p 8022 $(whoami)@<phone-ip>"
echo "  Docs:  http://<phone-ip>:8265/docs"
echo ""
