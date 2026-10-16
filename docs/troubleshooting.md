# PhonePilot Troubleshooting Guide

## Quick Diagnostics

Run this checklist when something isn't working:

```bash
# On your phone (Termux)
bash ~/phonepilot/status.sh
```

This checks: backend process, API health, SSH, network, battery, and recent logs.

---

## Common Issues

### 1. Backend Won't Start

**Symptom:** `bash ~/phonepilot/start.sh` fails or the process dies immediately.

**Check:**
```bash
# View error logs
tail -50 ~/phonepilot/logs/phonepilot.log

# Check if port is already in use
ss -tlnp | grep 8265

# Try running directly to see errors
source ~/phonepilot/.venv/bin/activate
cd ~/phonepilot/backend
python run.py
```

**Common causes:**
- Port 8265 already in use → Kill the old process or change the port in `.env`
- Missing dependencies → `pip install -r requirements.txt`
- Invalid `.env` file → Check syntax, regenerate if needed
- Database locked → Remove the `.db-wal` and `.db-shm` files, restart
- Python version mismatch → Ensure Python 3.10+ is installed

### 2. Can't Connect from PC

**Symptom:** Dashboard shows "Offline" or "Connection refused."

**Check from PC:**
```powershell
# Test basic connectivity
ping <phone-ip>

# Test API
curl http://<phone-ip>:8265/health

# Test with Tailscale IP
curl http://<phone-tailscale-ip>:8265/health
```

**Common causes:**
- Backend not running → Run `bash ~/phonepilot/start.sh` on phone
- Wrong IP address → Check with `ip addr show wlan0` or Tailscale app
- Firewall blocking → Android shouldn't block this, but check PC firewall
- Different network → Use Tailscale for cross-network access
- CORS error → Add your PC's URL to `PHONEPILOT_ALLOWED_ORIGINS` in `.env`

### 3. Authentication Fails (HTTP 401)

**Symptom:** API returns "Unauthorized" even with API key.

**Check:**
```bash
# Test with curl
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:8265/api/v1/tasks

# If you lost your API key, generate a new one:
source ~/phonepilot/.venv/bin/activate
cd ~/phonepilot/backend
python -c "
import secrets
key = secrets.token_urlsafe(32)
print(f'New API Key: {key}')
print(f'Update PHONEPILOT_API_KEY in your .env file')
"
```

**Common causes:**
- API key not in header → Use `Authorization: Bearer <key>`
- Wrong API key → Check `.env` file
- Key was regenerated → Update in dashboard Settings
- Whitespace in key → Copy carefully

### 4. Tasks Not Executing

**Symptom:** Tasks are created but never run.

**Check:**
```bash
# Check execution history
curl -H "Authorization: Bearer $API_KEY" http://localhost:8265/api/v1/history

# Check task status
curl -H "Authorization: Bearer $API_KEY" http://localhost:8265/api/v1/tasks
```

**Common causes:**
- Task is disabled → Enable it via API or dashboard
- Scheduler not running → Restart backend
- Task type not supported → Check adapter configuration
- Shell command not in allowlist → Only approved commands are permitted
- Task timed out → Check timeout settings

### 5. SSH Connection Issues

**Symptom:** Can't SSH into phone from PC.

**Check on phone:**
```bash
# Is sshd running?
pgrep sshd || echo "SSH not running"

# Start SSH
sshd

# Check port
ss -tlnp | grep 8022
```

**Check from PC:**
```powershell
# Test connection
ssh -v -p 8022 user@<phone-ip>
```

**Common causes:**
- sshd not started → Run `sshd` in Termux
- Wrong port → Termux uses 8022, not 22
- Wrong username → Run `whoami` in Termux
- Password not set → Run `passwd` in Termux
- Key mismatch → Check `~/.ssh/authorized_keys`
- Termux session closed → SSH needs Termux running (use Termux:Boot)

### 6. Backend Stops After Closing Termux

**Symptom:** PhonePilot stops when you swipe away Termux.

**Solutions:**
1. **Acquire wakelock in Termux:**
   ```bash
   termux-wake-lock
   bash ~/phonepilot/start.sh
   ```

2. **Use Termux notification:**
   - Pull down Termux notification → "Acquire wakelock"
   
3. **Battery optimization:**
   - Settings → Apps → Termux → Battery → Unrestricted
   - Settings → Apps → Tailscale → Battery → Unrestricted

4. **Don't force-stop Termux:**
   - Minimize instead of swiping away
   - Lock Termux in recent apps (long-press → lock icon)

### 7. Backend Doesn't Start After Reboot

**Symptom:** Phone reboots and PhonePilot doesn't come back.

**Check:**
```bash
# Is Termux:Boot installed?
ls ~/.termux/boot/

# Is the boot script present?
cat ~/.termux/boot/phonepilot-start.sh

# Is the script executable?
ls -la ~/.termux/boot/phonepilot-start.sh
```

**Requirements for auto-start:**
1. Install **Termux:Boot** from F-Droid
2. Open Termux:Boot at least once after install
3. Boot script must be in `~/.termux/boot/`
4. Script must be executable (`chmod 700`)
5. `termux.properties` must have `allow-external-apps = true`
6. Termux must not be battery-optimized

### 8. Tailscale Not Connected

**Symptom:** Can't reach phone via Tailscale IP.

**On phone:**
1. Open Tailscale app
2. Toggle OFF then ON
3. Check if it shows "Connected"

**Check:**
```bash
# In Termux
ip addr show tailscale0

# From PC
tailscale ping <phone-tailscale-ip>
tailscale status
```

**Common causes:**
- Tailscale app not running → Open and connect
- Different Tailscale accounts → Use same account on both devices
- VPN conflict → Only one VPN can be active on Android
- Mobile data → Tailscale works on mobile data but may be slower
- Always-on VPN not enabled → Enable in Android VPN settings

### 9. Dashboard Shows Stale Data

**Symptom:** Dashboard doesn't update or shows old information.

**Solutions:**
- Hard refresh: `Ctrl+Shift+R`
- Check auto-refresh interval in Settings
- Verify backend is reachable (check connection indicator)
- Clear browser cache/localStorage
- Check browser console for errors (`F12`)

### 10. Database Corruption

**Symptom:** Errors about SQLite, "database is locked", or "malformed."

**Fix:**
```bash
cd ~/phonepilot

# Stop backend
bash stop.sh

# Check database integrity
sqlite3 phonepilot.db "PRAGMA integrity_check;"

# If corrupted, backup and recreate
cp phonepilot.db phonepilot.db.backup
rm phonepilot.db

# Restart — database will be recreated
bash start.sh
```

> **Warning:** Recreating the database loses all task history and configurations. Saved tasks will need to be recreated.

---

## Getting Logs

### Backend logs
```bash
# Live log follow
tail -f ~/phonepilot/logs/phonepilot.log

# Last 100 lines
tail -100 ~/phonepilot/logs/phonepilot.log

# Search for errors
grep -i error ~/phonepilot/logs/phonepilot.log | tail -20
```

### Boot logs
```bash
cat ~/phonepilot/logs/boot.log
```

### Android system logs (for the native app)
```bash
# If ADB is connected
adb logcat -s PhonePilot:* *:E

# Filter for crashes
adb logcat -s AndroidRuntime:E
```

---

## Reset PhonePilot

If all else fails, here's how to do a clean reset:

```bash
# Stop everything
bash ~/phonepilot/stop.sh

# Backup important data
cp ~/phonepilot/.env ~/phonepilot/.env.backup

# Remove database (loses history)
rm -f ~/phonepilot/phonepilot.db*

# Reinstall dependencies
source ~/phonepilot/.venv/bin/activate
pip install --force-reinstall -r ~/phonepilot/backend/requirements.txt

# Restart
deactivate
bash ~/phonepilot/start.sh
```

For a complete reinstall:
```bash
# Remove everything except .env
rm -rf ~/phonepilot/.venv ~/phonepilot/logs ~/phonepilot/phonepilot.db*
bash ~/phonepilot/backend/../termux/setup.sh
```
