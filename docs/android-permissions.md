# PhonePilot Android Permission Matrix

## Overview

PhonePilot respects Android's permission model. Permissions are requested contextually — only when a feature that needs them is used. This document lists every permission, its purpose, and behavior when denied.

## Permission Categories

### Normal Permissions (Auto-granted at install)

| Permission | Purpose | Impact if Missing |
|-----------|---------|-------------------|
| `INTERNET` | Communicate with PhonePilot backend | App cannot function |
| `ACCESS_NETWORK_STATE` | Check WiFi/mobile data connectivity | Cannot show connection status |
| `ACCESS_WIFI_STATE` | Detect WiFi network details | Limited connectivity diagnostics |
| `FOREGROUND_SERVICE` | Run foreground service for health monitoring | Cannot maintain persistent monitoring |
| `FOREGROUND_SERVICE_SPECIAL_USE` | Foreground service type declaration | Required for Android 14+ |
| `RECEIVE_BOOT_COMPLETED` | Start health check after device reboot | No automatic restart after reboot |
| `WAKE_LOCK` | Keep CPU awake during task execution | Tasks may be interrupted during doze |

### Runtime Permissions (User must grant)

| Permission | Purpose | When Requested | Behavior if Denied |
|-----------|---------|---------------|-------------------|
| `POST_NOTIFICATIONS` (Android 13+) | Show task status notifications | When user enables notifications | No notifications; all info in-app only |
| `READ_EXTERNAL_STORAGE` (Android < 13) | Access files for file operations | When file adapter task is created | File operations limited to app-private storage |

### Special Permissions (User must enable in Settings)

| Permission | Purpose | How to Enable | Behavior if Denied |
|-----------|---------|--------------|-------------------|
| Accessibility Service | UI automation workflows | Settings → Accessibility → PhonePilot | UI automation unavailable; shown as "Requires Setup" |
| Battery Optimization Exemption | Reduce chance of process killing | Settings → Battery → Unrestricted | Backend may stop unexpectedly |
| Ignore Battery Optimizations | Request directly | In-app dialog | Same as above |

## Permission Request Flow

```
User opens feature → Check permission → 
├─ Already granted → Proceed
├─ Can request → Show rationale dialog → Request → 
│  ├─ Granted → Proceed
│  └─ Denied → Show "feature unavailable" message
└─ Permanently denied → Direct user to Settings
```

## Accessibility Service Details

The PhonePilot Accessibility Service is used **only** for user-defined UI automation workflows. It is:

- **Never auto-enabled** — the user must manually navigate to Settings → Accessibility
- **Clearly described** — the service description explains exactly what it does
- **Scoped** — only interacts with apps specified in the user's automation tasks
- **Monitored** — all accessibility actions are logged in the audit trail
- **Stoppable** — can be disabled at any time from Settings or the app

### What the Accessibility Service can do:
- Read visible UI element text and descriptions
- Detect which app/screen is currently showing
- Perform clicks on specified UI elements
- Scroll lists and containers
- Enter text in input fields

### What it CANNOT do:
- Read passwords or credential fields
- Access content of secure/flagged windows
- Interact with other accessibility services
- Bypass security prompts or confirmations
- Access clipboard or notifications silently

## Manufacturer-Specific Considerations

Some Android manufacturers add aggressive battery management that can kill background processes. Check your phone manufacturer:

| Manufacturer | Issue | Mitigation |
|-------------|-------|-----------|
| Samsung | Sleeping apps feature | Add to "Never sleeping apps" |
| Xiaomi/MIUI | Aggressive battery optimization | Enable "Autostart", disable battery saver for app |
| Huawei/EMUI | App launch management | Set to "Manage manually", enable all toggles |
| OnePlus/OxygenOS | Battery optimization | Disable optimization for PhonePilot and Termux |
| Oppo/ColorOS | Similar to OnePlus | Same mitigation |
| Vivo/FuntouchOS | Background power consumption | Allow background activity |

**Resource**: Visit https://dontkillmyapp.com for device-specific instructions.

## Android Version Compatibility

| Feature | Min Android | Notes |
|---------|------------|-------|
| Core app | Android 8.0 (API 26) | Minimum supported |
| WorkManager | Android 8.0+ | Automatic fallback to JobScheduler/AlarmManager |
| Notification channels | Android 8.0+ | Required for notifications |
| Foreground service types | Android 10+ | Required to declare service type |
| Exact alarms | Android 12+ | Requires SCHEDULE_EXACT_ALARM on 12+ |
| POST_NOTIFICATIONS runtime | Android 13+ | Must request at runtime |
| Foreground service restrictions | Android 14+ | Must declare foreground service type |
| Background activity launch | Android 10+ | Restricted; use notifications instead |

## Testing Permissions

Use the Diagnostics screen in the app to check all permission statuses:
1. Open PhonePilot app
2. Navigate to Diagnostics tab
3. View the Permission Matrix section
4. Each permission shows: Granted / Denied / Not Requested
5. Tap any denied permission to request or navigate to Settings
