# Tailscale Remote Connectivity Setup

## What is Tailscale?

Tailscale creates a private, encrypted mesh network (called a "tailnet") between your devices. It uses WireGuard encryption under the hood. This means your PC and Android phone can communicate securely over the internet without exposing any ports publicly.

**Why we use it:**
- No port forwarding required on your router
- Works across different networks (home, office, mobile data)
- End-to-end encrypted
- Simple setup compared to traditional VPN
- Free for personal use (up to 100 devices)

## Prerequisites

- A Tailscale account (free at https://tailscale.com)
- Admin access on your Windows PC
- Your Android phone

## Step 1: Set Up Tailscale on Windows PC

1. **Download Tailscale:**
   - Go to https://tailscale.com/download/windows
   - Download and run the installer

2. **Sign in:**
   - Click the Tailscale icon in the system tray
   - Sign in with your preferred identity provider (Google, Microsoft, GitHub, etc.)

3. **Verify connection:**
   ```powershell
   # In PowerShell, check your Tailscale IP
   tailscale status
   ```
   
   You should see your PC listed with a `100.x.y.z` IP address.

4. **Note your PC's Tailscale IP** — you'll need it for SSH connections.

## Step 2: Set Up Tailscale on Android

1. **Install Tailscale:**
   - Open Google Play Store
   - Search for "Tailscale"
   - Install the official Tailscale app

2. **Sign in:**
   - Open Tailscale
   - Sign in with the **same account** you used on your PC
   - Grant VPN permission when prompted

3. **Enable Always-on VPN (recommended):**
   - Go to Android Settings → Network → VPN
   - Tap the gear icon next to Tailscale
   - Enable "Always-on VPN"
   - This helps maintain connectivity after reboot

4. **Verify:**
   - In the Tailscale app, you should see both your PC and phone listed
   - Note your phone's Tailscale IP (100.x.y.z)

## Step 3: Test Connectivity

From your Windows PC PowerShell:

```powershell
# Ping your phone's Tailscale IP
ping <phone-tailscale-ip>

# You should see replies like:
# Reply from 100.x.y.z: bytes=32 time=15ms TTL=64
```

From Termux on your phone:

```bash
# Ping your PC's Tailscale IP
ping -c 4 <pc-tailscale-ip>
```

## Step 4: Set Up SSH Over Tailscale

### On the phone (Termux):

```bash
# Start SSH server
sshd

# SSH runs on port 8022 in Termux (not 22)
echo "SSH is listening on port 8022"
```

### From your PC:

```powershell
# Connect to phone via Tailscale
ssh -p 8022 u0_a<NNN>@<phone-tailscale-ip>

# The username is shown when you run 'whoami' in Termux
# Typically it's something like u0_a123
```

### Set up SSH key authentication (recommended):

On your PC:
```powershell
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "phonepilot-pc"

# Copy the public key
type $HOME\.ssh\id_ed25519.pub
```

On your phone (Termux):
```bash
# Paste the public key
echo "<paste-public-key-here>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Now you can connect without a password:
```powershell
ssh -p 8022 u0_a<NNN>@<phone-tailscale-ip>
```

## Step 5: Access PhonePilot API Over Tailscale

Once PhonePilot backend is running on your phone:

```powershell
# From PC, access the API
curl http://<phone-tailscale-ip>:8265/health

# Access the dashboard
# Open in browser: http://<phone-tailscale-ip>:8265
```

Configure the PC dashboard to use the Tailscale IP:
- Open dashboard Settings
- Set Backend URL to: `http://<phone-tailscale-ip>:8265`

The Android debug build can also connect to this HTTP URL. Android release builds
require an HTTPS backend URL; use an HTTPS reverse proxy or another TLS endpoint
if connecting from a release build.

## Troubleshooting

### Phone shows as offline in Tailscale

1. Open the Tailscale app on your phone
2. Ensure the toggle is ON
3. Check that you're signed in to the same account
4. Try disconnecting and reconnecting
5. If using "Always-on VPN", ensure no other VPN is active

### SSH connection refused

```bash
# On phone, check if sshd is running
pgrep sshd

# If not running, start it
sshd

# Check the port
logcat -s sshd 2>/dev/null || echo "Check: ss -tlnp | grep 8022"
```

### Tailscale doesn't reconnect after reboot

- Android may kill the Tailscale VPN after reboot
- Enable "Always-on VPN" in Android VPN settings
- Some manufacturers aggressively kill background apps; check:
  - https://dontkillmyapp.com for your phone brand
  - Exclude Tailscale from battery optimization

### Can't reach PhonePilot API

```bash
# On phone, verify backend is running
bash ~/phonepilot/status.sh

# Check if port 8265 is listening
ss -tlnp | grep 8265

# Try local access first
curl http://localhost:8265/health
```

### Tailscale IP changed

Tailscale IPs are stable and don't normally change. If they do:
```powershell
# On PC
tailscale status

# On phone (Termux)
ip addr show tailscale0
```

## Security Notes

- Tailscale traffic is end-to-end encrypted with WireGuard
- Only devices in YOUR tailnet can reach each other
- PhonePilot API still requires authentication even over Tailscale
- Don't share your Tailscale auth keys
- Review connected devices periodically at https://login.tailscale.com/admin/machines
- You can use Tailscale ACLs for additional access control

## Using MagicDNS (Optional)

Tailscale can assign DNS names to your devices:

1. Go to https://login.tailscale.com/admin/dns
2. Enable MagicDNS
3. Your phone might be accessible as `android-phone.tailnet-name.ts.net`
4. Use this hostname instead of the IP in dashboard settings

This is more convenient and survives IP changes.
