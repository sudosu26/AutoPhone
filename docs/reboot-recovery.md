# PhonePilot Reboot & Recovery Guide

## Understanding Android Background Process Limitations

Android actively manages background processes to preserve battery life. This means:

1. **No guaranteed 24/7 execution** — Android can and will kill background processes
2. **Doze mode** — When the screen is off, Android limits network access and CPU usage
3. **App standby** — Apps not recently used get restricted
4. **Manufacturer restrictions** — Many OEMs add additional killing (Samsung, Xiaomi, Huawei, etc.)

PhonePilot uses multiple strategies to maximize reliability within these constraints.

## Recovery Mechanisms

### Layer 1: Termux:Boot (Shell-level recovery)

**What it does:** Runs a shell script when the device boots.

**How it works:**
```
Device boots → Android starts → Termux:Boot triggers → 
configured boot script runs `bash ~/phonepilot/phonepilot.sh start`
```

**Requirements:**
- Termux:Boot installed from F-Droid
- Opened at least once after installation
- A boot script in `~/.termux/boot/` that invokes
  `bash ~/phonepilot/phonepilot.sh start`

**Limitations:**
- Script runs in Termux session (Termux must not be disabled)
- Takes ~10-30 seconds after boot to execute
- Some manufacturers delay or block boot receivers

### Layer 2: Android WorkManager (App-level recovery)

**What it does:** Periodically checks backend health and reports status.

**How it works:**
```
WorkManager schedules HealthCheckWorker → Every 15 minutes →
Worker pings http://localhost:8265/health →
Reports status via notification or UI update
```

**Benefits:**
- Survives app restarts
- Works in Doze mode (periodic window)
- Backed by Android's JobScheduler
- Configurable retry policy

**Limitations:**
- Minimum interval is 15 minutes
- Cannot restart Termux processes (different app)
- May be delayed in Doze mode (batched execution)

### Layer 3: Boot Broadcast Receiver (App-level)

**What it does:** Native Android app receives BOOT_COMPLETED broadcast.

**How it works:**
```
Device boots → BOOT_COMPLETED broadcast → 
BootReceiver triggers → Enqueues HealthCheckWorker →
Logs boot event → Optionally shows notification
```

**Requirements:**
- `RECEIVE_BOOT_COMPLETED` permission in manifest
- PhonePilot app not force-stopped by user

### Layer 4: Backend Self-Recovery

**What it does:** The Python backend handles interrupted tasks on startup.

**Startup recovery process:**
1. Check database for tasks in `running` state
2. Mark them as `failed` with reason "Interrupted by restart"
3. Check scheduled tasks and reschedule active ones
4. Log recovery actions
5. Resume scheduler
6. Report last successful health timestamp

## Recovery Scenarios

### Scenario: Device Reboots

```
Timeline:
  0s   - Device powers on
  10s  - Android boots
  15s  - BOOT_COMPLETED broadcast
         → PhonePilot app BootReceiver fires
         → WorkManager HealthCheckWorker enqueued
  20s  - Termux:Boot may fire if configured
         → configured boot script starts PhonePilot
  30s  - Backend starts
         → Database recovery runs
         → Interrupted tasks marked as failed
         → Scheduler resumes
  45s  - HealthCheckWorker runs
         → Detects backend is healthy
         → Updates status
  60s  - System fully operational
```

**What to expect:**
- ~1 minute total recovery time
- Any tasks that were running during shutdown will be marked as failed
- Scheduled tasks will resume at their next scheduled time
- Dashboard will show "reconnected" when backend is reachable

### Scenario: Termux Process Killed

**Cause:** Android OOM killer, battery optimization, user swipe

**Recovery:**
1. WorkManager detects backend is unreachable (next health check)
2. Notification shown: "PhonePilot backend is offline"
3. User opens Termux → Process restarts
4. Run `bash ~/phonepilot/phonepilot.sh start`

**Prevention:**
```bash
# Acquire Termux wakelock
termux-wake-lock

# Exclude from battery optimization
# (Do this in Android Settings → Apps → Termux → Battery → Unrestricted)
```

### Scenario: Network Disconnected

**What happens:**
- Backend continues running locally
- Remote API calls fail (timeout)
- Dashboard shows "Offline"
- Tasks not requiring network continue executing
- Network-dependent tasks fail with "Network unreachable"

**Recovery:**
- Automatic when network reconnects
- Dashboard auto-reconnects (polling every 30s)
- Failed network tasks can be retried

### Scenario: Tailscale Disconnected

**What happens:**
- Local network access still works
- Remote (cross-network) access fails
- SSH over Tailscale fails

**Recovery:**
1. Open Tailscale app on phone
2. Ensure VPN is connected
3. Test: `ping <pc-tailscale-ip>` from Termux

**Prevention:**
- Enable "Always-on VPN" for Tailscale in Android Settings
- Exclude Tailscale from battery optimization

### Scenario: Backend Crash

**What happens:**
- Process exits with error
- PID file may be stale
- Tasks in-flight are interrupted

**Recovery:**
```bash
# Check what happened
bash ~/phonepilot/phonepilot.sh logs

# Clean up and restart
bash ~/phonepilot/phonepilot.sh stop
bash ~/phonepilot/phonepilot.sh start
```

**Automatic recovery:**
- Termux:Boot can restart on next reboot if configured separately
- Consider adding a watchdog cron job:

```bash
# Add to Termux crontab (if crond is available)
# Check every 5 minutes, restart if down
*/5 * * * * bash ~/phonepilot/phonepilot.sh start
```

## Preventive Measures

### 1. Battery Optimization Exemption

For both Termux and Tailscale:
```
Settings → Apps → [App Name] → Battery → Unrestricted
```

### 2. Lock App in Recents

Long-press Termux in the recent apps view → tap the lock icon. This prevents it from being killed when clearing recents.

### 3. Termux Wakelock

```bash
# Prevents CPU from sleeping
termux-wake-lock

# Appears in Termux notification as "wake lock held"
```

### 4. Manufacturer-Specific Settings

Visit https://dontkillmyapp.com for your phone brand and follow the instructions.

### 5. Watchdog Script

Create a simple watchdog that restarts the backend if it dies:

```bash
#!/data/data/com.termux/files/usr/bin/bash
# ~/phonepilot/watchdog.sh
# Run in a separate Termux session: bash ~/phonepilot/watchdog.sh

while true; do
    if ! bash ~/phonepilot/phonepilot.sh status > /dev/null 2>&1; then
        echo "[$(date -Iseconds)] Backend is down. Restarting..."
        bash ~/phonepilot/phonepilot.sh start
        sleep 30  # Wait for startup
    fi
    sleep 300  # Check every 5 minutes
done
```

## Monitoring

### Health Check Endpoint

```bash
# Quick check
curl -s http://localhost:8265/health | jq .

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-15T10:30:00Z",
#   "version": "1.0.0",
#   "uptime_seconds": 3600
# }
```

### Status Indicators

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 Healthy | All systems operational | None |
| 🟡 Degraded | Some components unavailable | Check diagnostics |
| 🔴 Offline | Backend unreachable | Restart backend |
| ⚪ Unknown | Never connected | Check configuration |

### Diagnostic Endpoint

```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:8265/api/v1/system/diagnostics | jq .
```

Returns:
- Backend uptime
- Database status
- Scheduler status
- Active task count
- Last successful execution
- Error count (last 24h)
- Disk usage
- Memory usage
