package com.phonepilot.app.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class PhonePilotAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        _isRunning.value = true
        _instance = this
        Log.i(TAG, "PhonePilot Accessibility Service connected.")

        // Configure runtime capabilities
        val info = serviceInfo ?: AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                AccessibilityEvent.TYPE_VIEW_CLICKED or
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.notificationTimeout = 100
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val pkgName = event.packageName?.toString() ?: return
        _lastDetectedPackage.value = pkgName
        _lastEventTimestamp.value = System.currentTimeMillis()

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                Log.d(TAG, "Window state changed: $pkgName / ${event.className}")
            }
            AccessibilityEvent.TYPE_VIEW_CLICKED -> {
                Log.d(TAG, "View clicked in: $pkgName")
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                // Content updated, passive tracking
            }
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "PhonePilot Accessibility Service interrupted.")
    }

    override fun onDestroy() {
        super.onDestroy()
        _isRunning.value = false
        if (_instance == this) {
            _instance = null
        }
        Log.i(TAG, "PhonePilot Accessibility Service destroyed.")
    }

    /**
     * Safely search for accessibility nodes matching specified view ID.
     */
    fun findNodesByViewId(viewId: String): List<AccessibilityNodeInfo> {
        val root = rootInActiveWindow ?: return emptyList()
        return root.findAccessibilityNodeInfosByViewId(viewId) ?: emptyList()
    }

    /**
     * Safely search for accessibility nodes matching visible text.
     */
    fun findNodesByText(text: String): List<AccessibilityNodeInfo> {
        val root = rootInActiveWindow ?: return emptyList()
        return root.findAccessibilityNodeInfosByText(text) ?: emptyList()
    }

    /**
     * Perform click on given node if clickable, or attempt parent click.
     */
    fun performClick(node: AccessibilityNodeInfo): Boolean {
        var current: AccessibilityNodeInfo? = node
        while (current != null) {
            if (current.isClickable) {
                return current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
            current = current.parent
        }
        return false
    }

    companion object {
        private const val TAG = "PhonePilotA11y"

        private var _instance: PhonePilotAccessibilityService? = null
        val instance: PhonePilotAccessibilityService? get() = _instance

        private val _isRunning = MutableStateFlow(false)
        val isRunning: StateFlow<Boolean> = _isRunning.asStateFlow()

        private val _lastDetectedPackage = MutableStateFlow<String?>(null)
        val lastDetectedPackage: StateFlow<String?> = _lastDetectedPackage.asStateFlow()

        private val _lastEventTimestamp = MutableStateFlow(0L)
        val lastEventTimestamp: StateFlow<Long> = _lastEventTimestamp.asStateFlow()
    }
}
