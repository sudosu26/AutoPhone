# PhonePilot Security Model

## Overview

PhonePilot is a device management tool that can execute automation tasks on your Android phone. This document describes the security architecture, threat model, and implemented protections.

## Threat Model

### Assets to Protect
1. **Device access** — Preventing unauthorized control of your phone
2. **Data confidentiality** — Protecting personal data, credentials, files
3. **Service availability** — Ensuring the automation engine runs when needed
4. **Execution integrity** — Ensuring only authorized tasks execute

### Threat Actors
1. **Network attacker** — Someone on the same network (e.g., public WiFi)
2. **Remote attacker** — Someone attempting access over the internet
3. **Malicious task** — A crafted task attempting to escape sandboxing

### Out of Scope
- Physical device theft (use Android device encryption)
- Rooted device exploitation (PhonePilot doesn't require root)
- OS-level vulnerabilities (keep Android updated)

## Authentication Architecture

### API Key Authentication
- A unique API key is generated on first run
- The key is stored as a SHA-256 hash in the database
- Every API request (except `/health`) must include the key
- Header: `Authorization: Bearer <api-key>`
- Invalid keys return HTTP 401 with no additional information

### JWT Session Tokens
- After authenticating with the API key, clients can obtain a JWT token
- JWTs expire after 24 hours
- JWTs contain: subject, issued-at, expiration
- JWTs are signed with the server's secret key (unique per installation)
- Refresh mechanism available for long-running dashboard sessions

### Credential Storage
- API key: SHA-256 hash in SQLite
- Secret key: generated randomly, stored in `.env` file
- `.env` file permissions: 600 (owner read/write only)
- No credentials in source code or version control
- No default passwords

## Authorization Model

### Action Allowlist

PhonePilot uses a **strict allowlist** approach. Only explicitly permitted operations can be executed:

| Adapter | Allowed Actions | Restrictions |
|---------|----------------|--------------|
| Shell | `ls`, `cat`, `echo`, `ping`, `date`, `uptime`, `df`, `free`, `whoami`, `termux-battery-status`, `termux-wifi-connectioninfo` | No pipes, redirects, or command chaining |
| File | `read`, `write`, `list`, `delete`, `exists`, `stat` | Sandboxed to `SANDBOX_DIR`; deleting the sandbox root is rejected |
| HTTP | `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS` | HTTP/HTTPS URLs configured by an authenticated user; no destination allowlist is currently enforced |
| App Launch | `am start` | Package name validation, no arbitrary intents |

### What Is NOT Allowed
- Arbitrary shell command execution
- Access to files outside the sandbox
- Direct SQL execution
- Credential extraction
- Security setting modification
- Accessibility service control bypass
- Silent permission granting

## Input Validation

### API Requests
- All request bodies validated via Pydantic models
- Task names: non-empty, max 100 characters
- Task descriptions: optional
- Cron expressions: validated syntax
- File paths: resolved and checked against sandbox boundary
- URLs: scheme validation (http/https only)
- Shell commands: matched against allowlist before execution

### Injection Prevention
- **Command injection**: Shell commands are executed via `subprocess` with `shell=False` and argument arrays, never string interpolation
- **Path traversal**: All file paths are resolved to absolute paths and verified to be within `SANDBOX_DIR`
- **Sandbox deletion**: Deleting the sandbox root itself is rejected
- **SQL injection**: All database queries use parameterized statements (via aiosqlite)
- **XSS**: API returns JSON only; dashboard uses React's built-in escaping

## Network Security

### Default Binding
- Backend binds to `0.0.0.0:8265` (configurable)
- This allows access from Tailscale and local network
- **NOT** exposed to the public internet (no port forwarding recommended)

### Tailscale Layer
- All remote traffic goes through Tailscale's WireGuard tunnel
- End-to-end encrypted
- Only authenticated tailnet members can reach the device
- Tailscale ACLs can further restrict access

### CORS
- Configured allowed origins (default: localhost only)
- Prevents browser-based cross-origin attacks
- Must be explicitly configured for dashboard access

### Rate Limiting
- 100 requests per minute per client (configurable)
- Rate-limit buckets are keyed by the connecting client's IP, not caller-supplied authentication headers
- Prevents brute-force and denial-of-service
- Returns HTTP 429 when exceeded

## Audit Logging

Every security-relevant action is logged:

| Event | Logged Data |
|-------|------------|
| Authentication attempt | Success/failure, IP address, timestamp |
| Task creation | Task details, creator, timestamp |
| Task execution | Task ID, parameters, result, duration |
| Task modification | Changed fields, modifier, timestamp |
| Configuration change | Setting key, old/new value (secrets redacted) |
| Authorization failure | Attempted action, IP, timestamp |

### Log Security
- Secrets are redacted from all log output
- API keys show only last 4 characters
- Stack traces are logged server-side only
- Client-facing errors use generic messages

## Database Security

- SQLite with WAL mode for concurrent access
- Database file permissions: 600
- No plaintext credential storage
- Transaction isolation for state changes
- Regular integrity checks

## Operational Security

### Process Isolation
- PhonePilot runs as the Termux user (non-root)
- Limited to Termux's sandboxed filesystem
- No access to other app data
- Android's permission model applies

### Secret Management
- Secrets generated using `secrets.token_urlsafe()`
- Environment variables for configuration
- `.env` file excluded from version control
- Support for credential rotation

### Dependency Security
- All dependencies pinned to specific versions
- Regular review recommended
- No unnecessary dependencies

## Permission Matrix

| Permission | Purpose | Required | Runtime |
|-----------|---------|----------|---------|
| INTERNET | API communication | Yes | No |
| ACCESS_NETWORK_STATE | Connectivity checks | Yes | No |
| RECEIVE_BOOT_COMPLETED | Auto-start after reboot | Optional | No |
| POST_NOTIFICATIONS | Status notifications | Optional | Yes (Android 13+) |
| BIND_ACCESSIBILITY_SERVICE | UI automation | Optional | User must enable in Settings |

## Known Limitations

1. **No HTTPS by default**: The backend API uses HTTP. Tailscale encrypts traffic sent through its VPN, but local-network traffic outside Tailscale is unencrypted. The Android debug build allows HTTP; Android release builds require HTTPS.
2. **Single-user**: PhonePilot is designed for one user controlling one device. Multi-user access control is not implemented.
3. **HTTP destination access**: HTTP tasks can connect to any configured HTTP/HTTPS destination reachable from the backend host. Only create tasks you trust; do not expose the API to untrusted users.
4. **SQLite limitations**: Not suitable for high-concurrency scenarios (not expected for single-device use).
5. **Android background restrictions**: Android may kill the backend process; Termux:Boot provides best-effort recovery.

## Recommendations

1. **Always use Tailscale** for remote access
2. **Don't expose port 8265** to the public internet
3. **Rotate API key** periodically via the settings endpoint
4. **Review audit logs** regularly
5. **Keep Termux and dependencies updated**
6. **Don't disable Android security features** for PhonePilot
7. **Use SSH key authentication** instead of passwords
8. **Enable Android device encryption**
