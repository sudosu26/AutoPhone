#!/data/data/com.termux/files/usr/bin/bash
# Backward-compatible alias; all setup and service logic lives in phonepilot.sh.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$#" -eq 0 ]; then
    set -- run
fi
exec bash "$SCRIPT_DIR/phonepilot.sh" "$@"
