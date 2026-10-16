package com.phonepilot.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.phonepilot.app.data.model.ConnectivityTestResult
import com.phonepilot.app.data.repository.DeviceRepository
import com.phonepilot.app.util.AppPreferences
import com.phonepilot.app.util.PermissionHelper
import com.phonepilot.app.util.PermissionItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SettingsViewModel(
    application: Application,
    private val preferences: AppPreferences = AppPreferences.getInstance(application),
    private val deviceRepository: DeviceRepository = DeviceRepository.getInstance(application)
) : AndroidViewModel(application) {

    val serverUrl: StateFlow<String> = preferences.backendUrlFlow

    private val _apiKey = MutableStateFlow(preferences.apiKey)
    val apiKey: StateFlow<String> = _apiKey.asStateFlow()

    val themeMode: StateFlow<String> = preferences.themeModeFlow
    val isEngineEnabled: StateFlow<Boolean> = preferences.engineEnabledFlow

    val connectionStatus: StateFlow<Boolean> = deviceRepository.isBackendConnected

    private val _testResult = MutableStateFlow<ConnectivityTestResult?>(null)
    val testResult: StateFlow<ConnectivityTestResult?> = _testResult.asStateFlow()

    private val _isTesting = MutableStateFlow(false)
    val isTesting: StateFlow<Boolean> = _isTesting.asStateFlow()

    private val _permissions = MutableStateFlow<List<PermissionItem>>(emptyList())
    val permissions: StateFlow<List<PermissionItem>> = _permissions.asStateFlow()

    init {
        refreshPermissions()
    }

    fun updateServerUrl(url: String) {
        preferences.backendUrl = url
    }

    fun updateApiKey(key: String) {
        preferences.apiKey = key
        _apiKey.value = key
    }

    fun setThemeMode(mode: String) {
        preferences.themeMode = mode
    }

    fun toggleEngine(enabled: Boolean) {
        preferences.isEngineEnabled = enabled
        deviceRepository.setEngineRunning(enabled)
    }

    fun testConnection() {
        viewModelScope.launch {
            _isTesting.value = true
            _testResult.value = null
            try {
                val result = deviceRepository.testConnectivity()
                _testResult.value = result
            } catch (e: Exception) {
                _testResult.value = ConnectivityTestResult(
                    isSuccess = false,
                    latencyMs = 0L,
                    statusCode = 0,
                    responseMessage = e.message ?: "Failed to connect to backend",
                    endpointTested = preferences.backendUrl
                )
            } finally {
                _isTesting.value = false
            }
        }
    }

    fun refreshPermissions() {
        _permissions.value = PermissionHelper.getAllPermissionsStatus(getApplication())
    }

    fun resetToDefaultBackendUrl() {
        preferences.backendUrl = AppPreferences.DEFAULT_BACKEND_URL
    }
}
