package com.phonepilot.app.util

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AppPreferences(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _backendUrlFlow = MutableStateFlow(backendUrl)
    val backendUrlFlow: StateFlow<String> = _backendUrlFlow.asStateFlow()

    private val _themeModeFlow = MutableStateFlow(themeMode)
    val themeModeFlow: StateFlow<String> = _themeModeFlow.asStateFlow()

    private val _engineEnabledFlow = MutableStateFlow(isEngineEnabled)
    val engineEnabledFlow: StateFlow<Boolean> = _engineEnabledFlow.asStateFlow()

    var backendUrl: String
        get() = prefs.getString(KEY_BACKEND_URL, DEFAULT_BACKEND_URL) ?: DEFAULT_BACKEND_URL
        set(value) {
            val sanitized = if (value.endsWith("/")) value else "$value/"
            prefs.edit().putString(KEY_BACKEND_URL, sanitized).apply()
            _backendUrlFlow.value = sanitized
        }

    var apiKey: String
        get() = prefs.getString(KEY_API_KEY, "") ?: ""
        set(value) {
            prefs.edit().putString(KEY_API_KEY, value).apply()
        }

    var themeMode: String
        get() = prefs.getString(KEY_THEME_MODE, THEME_SYSTEM) ?: THEME_SYSTEM
        set(value) {
            prefs.edit().putString(KEY_THEME_MODE, value).apply()
            _themeModeFlow.value = value
        }

    var isEngineEnabled: Boolean
        get() = prefs.getBoolean(KEY_ENGINE_ENABLED, false)
        set(value) {
            prefs.edit().putBoolean(KEY_ENGINE_ENABLED, value).apply()
            _engineEnabledFlow.value = value
        }

    var lastHeartbeatTimestamp: Long
        get() = prefs.getLong(KEY_LAST_HEARTBEAT, 0L)
        set(value) {
            prefs.edit().putLong(KEY_LAST_HEARTBEAT, value).apply()
        }

    var deviceName: String
        get() = prefs.getString(KEY_DEVICE_NAME, android.os.Build.MODEL) ?: android.os.Build.MODEL
        set(value) {
            prefs.edit().putString(KEY_DEVICE_NAME, value).apply()
        }

    fun clearAuth() {
        prefs.edit().remove(KEY_API_KEY).apply()
    }

    companion object {
        private const val PREFS_NAME = "phonepilot_prefs"
        private const val KEY_BACKEND_URL = "key_backend_url"
        private const val KEY_API_KEY = "key_api_key"
        private const val KEY_THEME_MODE = "key_theme_mode"
        private const val KEY_ENGINE_ENABLED = "key_engine_enabled"
        private const val KEY_LAST_HEARTBEAT = "key_last_heartbeat"
        private const val KEY_DEVICE_NAME = "key_device_name"

        const val DEFAULT_BACKEND_URL = "http://10.0.2.2:8000/"
        const val THEME_SYSTEM = "system"
        const val THEME_LIGHT = "light"
        const val THEME_DARK = "dark"

        @Volatile
        private var instance: AppPreferences? = null

        fun getInstance(context: Context): AppPreferences {
            return instance ?: synchronized(this) {
                instance ?: AppPreferences(context.applicationContext).also { instance = it }
            }
        }
    }
}
