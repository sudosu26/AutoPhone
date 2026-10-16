package com.phonepilot.app.util

import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import androidx.core.content.ContextCompat
import com.phonepilot.app.service.PhonePilotAccessibilityService

data class PermissionItem(
    val title: String,
    val description: String,
    val isGranted: Boolean,
    val isCritical: Boolean,
    val requiredApiLevel: Int = 26,
    val intentAction: (() -> Intent)? = null
)

object PermissionHelper {

    fun isNotificationPermissionGranted(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // Granted automatically prior to Android 13
        }
    }

    fun isAccessibilityServiceEnabled(context: Context): Boolean {
        // Method 1: Check runtime running flag from service companion
        if (PhonePilotAccessibilityService.isRunning.value) {
            return true
        }

        // Method 2: Check through AccessibilityManager
        val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
        if (am != null) {
            val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            val expectedService = "${context.packageName}/${PhonePilotAccessibilityService::class.java.canonicalName}"
            for (service in enabledServices) {
                if (service.id.equals(expectedService, ignoreCase = true) ||
                    service.id.contains(context.packageName) && service.id.contains("PhonePilotAccessibilityService")
                ) {
                    return true
                }
            }
        }

        // Method 3: Check Secure Settings enabled services string
        val enabledServicesSetting = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        val simpleName = "${context.packageName}/${PhonePilotAccessibilityService::class.java.name}"
        val shortName = "${context.packageName}/.service.PhonePilotAccessibilityService"
        return enabledServicesSetting.contains(simpleName) || enabledServicesSetting.contains(shortName)
    }

    fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            ?: return false
        return powerManager.isIgnoringBatteryOptimizations(context.packageName)
    }

    fun getAccessibilitySettingsIntent(): Intent {
        return Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
    }

    fun getBatteryOptimizationIntent(context: Context): Intent {
        return Intent().apply {
            action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
            data = Uri.parse("package:${context.packageName}")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
    }

    fun getAppDetailsSettingsIntent(context: Context): Intent {
        return Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
    }

    fun getAllPermissionsStatus(context: Context): List<PermissionItem> {
        val list = mutableListOf<PermissionItem>()

        // 1. Accessibility Service
        val a11yGranted = isAccessibilityServiceEnabled(context)
        list.add(
            PermissionItem(
                title = "Accessibility Service",
                description = "Required for on-device UI inspection, click emulation, and automation workflows.",
                isGranted = a11yGranted,
                isCritical = true,
                intentAction = { getAccessibilitySettingsIntent() }
            )
        )

        // 2. Battery Optimization Exemption
        val batteryIgnored = isIgnoringBatteryOptimizations(context)
        list.add(
            PermissionItem(
                title = "Background Battery Exemption",
                description = "Prevents Android OEM power managers from killing PhonePilot background heartbeats and triggers.",
                isGranted = batteryIgnored,
                isCritical = true,
                intentAction = { getBatteryOptimizationIntent(context) }
            )
        )

        // 3. Post Notifications (Android 13+)
        val notifGranted = isNotificationPermissionGranted(context)
        list.add(
            PermissionItem(
                title = "Notifications",
                description = "Required to display status alerts, task execution errors, and heartbeat monitoring notifications.",
                isGranted = notifGranted,
                isCritical = false,
                requiredApiLevel = Build.VERSION_CODES.TIRAMISU,
                intentAction = { getAppDetailsSettingsIntent(context) }
            )
        )

        // 4. Internet Access
        val internetGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.INTERNET
        ) == PackageManager.PERMISSION_GRANTED
        list.add(
            PermissionItem(
                title = "Internet Access",
                description = "Required to communicate with the PhonePilot control server and dispatch automation payloads.",
                isGranted = internetGranted,
                isCritical = true
            )
        )

        // 5. Network State Access
        val networkStateGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_NETWORK_STATE
        ) == PackageManager.PERMISSION_GRANTED
        list.add(
            PermissionItem(
                title = "Network State",
                description = "Required to monitor active WiFi, Cellular, and Tailscale VPN interfaces.",
                isGranted = networkStateGranted,
                isCritical = false
            )
        )

        return list
    }
}
