package com.phonepilot.app.data.repository

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.os.SystemClock
import com.phonepilot.app.data.api.ApiClient
import com.phonepilot.app.data.model.ConnectivityTestResult
import com.phonepilot.app.data.model.DeviceStatus
import com.phonepilot.app.data.model.HeartbeatRequest
import com.phonepilot.app.data.model.NetworkResult
import com.phonepilot.app.util.AppPreferences
import com.phonepilot.app.util.NetworkUtils
import com.phonepilot.app.util.PermissionHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext

class DeviceRepository(private val context: Context) {

    private val apiClient = ApiClient.getInstance(context)
    private val preferences = AppPreferences.getInstance(context)

    private val _deviceStatusFlow = MutableStateFlow(getFreshDeviceStatus())
    val deviceStatusFlow: StateFlow<DeviceStatus> = _deviceStatusFlow.asStateFlow()

    private val _isBackendConnected = MutableStateFlow(false)
    val isBackendConnected: StateFlow<Boolean> = _isBackendConnected.asStateFlow()

    private val _backendLatency = MutableStateFlow<Long?>(null)
    val backendLatency: StateFlow<Long?> = _backendLatency.asStateFlow()

    fun getFreshDeviceStatus(): DeviceStatus {
        val batteryIntent = context.registerReceiver(
            null,
            IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        )
        val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: 100
        val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: 100
        val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale) else 100

        val statusExtra = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = statusExtra == BatteryManager.BATTERY_STATUS_CHARGING ||
                statusExtra == BatteryManager.BATTERY_STATUS_FULL

        val rawTemp = batteryIntent?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 250) ?: 250
        val batteryTemp = rawTemp / 10f

        val isWifi = NetworkUtils.isWifiConnected(context)
        val wifiSsid = if (isWifi) NetworkUtils.getWifiSsid(context) else null
        val wifiIp = NetworkUtils.getLocalIpAddress()
        val tailscaleIp = NetworkUtils.getTailscaleIp()
        val isTailscaleActive = NetworkUtils.isTailscaleActive(context)
        val isTermuxInstalled = NetworkUtils.isTermuxInstalled(context)
        val isA11yEnabled = PermissionHelper.isAccessibilityServiceEnabled(context)
        val isEngineRunning = preferences.isEngineEnabled

        val actManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        actManager?.getMemoryInfo(memInfo)
        val totalRamMb = memInfo.totalMem / (1024 * 1024)
        val freeRamMb = memInfo.availMem / (1024 * 1024)

        val statFs = StatFs(Environment.getDataDirectory().path)
        val totalStorageGb = (statFs.blockCountLong * statFs.blockSizeLong).toFloat() / (1024 * 1024 * 1024)
        val freeStorageGb = (statFs.availableBlocksLong * statFs.blockSizeLong).toFloat() / (1024 * 1024 * 1024)

        val uptimeSeconds = SystemClock.elapsedRealtime() / 1000

        val deviceId = preferences.deviceName.replace("\\s+".toRegex(), "_") + "_" + Build.BOARD

        return DeviceStatus(
            deviceId = deviceId,
            deviceName = preferences.deviceName,
            batteryLevel = batteryPct,
            isCharging = isCharging,
            batteryTemp = batteryTemp,
            wifiConnected = isWifi,
            wifiSsid = wifiSsid,
            wifiIp = wifiIp,
            tailscaleActive = isTailscaleActive,
            tailscaleIp = tailscaleIp,
            termuxInstalled = isTermuxInstalled,
            accessibilityEnabled = isA11yEnabled,
            engineRunning = isEngineRunning,
            androidVersion = Build.VERSION.RELEASE,
            apiLevel = Build.VERSION.SDK_INT,
            manufacturer = Build.MANUFACTURER,
            model = Build.MODEL,
            totalRamMb = totalRamMb,
            freeRamMb = freeRamMb,
            totalStorageGb = totalStorageGb,
            freeStorageGb = freeStorageGb,
            uptimeSeconds = uptimeSeconds
        )
    }

    suspend fun refreshDeviceStatus(): DeviceStatus = withContext(Dispatchers.Default) {
        val status = getFreshDeviceStatus()
        _deviceStatusFlow.value = status
        status
    }

    suspend fun checkBackendHealth(): Boolean = withContext(Dispatchers.IO) {
        val start = System.currentTimeMillis()
        val result = apiClient.safeApiCall { apiClient.api.checkHealth() }
        val latency = System.currentTimeMillis() - start
        val connected = result is NetworkResult.Success
        _isBackendConnected.value = connected
        _backendLatency.value = if (connected) latency else null
        connected
    }

    suspend fun sendHeartbeat(): Boolean = withContext(Dispatchers.IO) {
        val current = refreshDeviceStatus()
        val request = HeartbeatRequest(
            deviceId = current.deviceId,
            deviceName = current.deviceName,
            batteryLevel = current.batteryLevel,
            isCharging = current.isCharging,
            wifiIp = current.wifiIp,
            tailscaleIp = current.tailscaleIp,
            engineRunning = current.engineRunning,
            accessibilityEnabled = current.accessibilityEnabled
        )

        val result = apiClient.safeApiCall { apiClient.api.sendHeartbeat(request) }
        val success = result is NetworkResult.Success
        if (success) {
            preferences.lastHeartbeatTimestamp = System.currentTimeMillis()
        }
        success
    }

    suspend fun testConnectivity(): ConnectivityTestResult {
        val result = apiClient.testConnectivity()
        _isBackendConnected.value = result.isSuccess
        _backendLatency.value = if (result.isSuccess) result.latencyMs else null
        return result
    }

    fun setEngineRunning(enabled: Boolean) {
        preferences.isEngineEnabled = enabled
        _deviceStatusFlow.value = _deviceStatusFlow.value.copy(engineRunning = enabled)
    }

    companion object {
        @Volatile
        private var instance: DeviceRepository? = null

        fun getInstance(context: Context): DeviceRepository {
            return instance ?: synchronized(this) {
                instance ?: DeviceRepository(context.applicationContext).also { instance = it }
            }
        }
    }
}
