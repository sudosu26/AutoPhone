package com.phonepilot.app.data.model

import com.google.gson.annotations.SerializedName

data class DeviceStatus(
    @SerializedName("deviceId") val deviceId: String = "",
    @SerializedName("deviceName") val deviceName: String = "",
    @SerializedName("batteryLevel") val batteryLevel: Int = 100,
    @SerializedName("isCharging") val isCharging: Boolean = false,
    @SerializedName("batteryTemp") val batteryTemp: Float = 25.0f,
    @SerializedName("wifiConnected") val wifiConnected: Boolean = false,
    @SerializedName("wifiSsid") val wifiSsid: String? = null,
    @SerializedName("wifiIp") val wifiIp: String? = null,
    @SerializedName("tailscaleActive") val tailscaleActive: Boolean = false,
    @SerializedName("tailscaleIp") val tailscaleIp: String? = null,
    @SerializedName("termuxInstalled") val termuxInstalled: Boolean = false,
    @SerializedName("accessibilityEnabled") val accessibilityEnabled: Boolean = false,
    @SerializedName("engineRunning") val engineRunning: Boolean = false,
    @SerializedName("androidVersion") val androidVersion: String = "",
    @SerializedName("apiLevel") val apiLevel: Int = 0,
    @SerializedName("manufacturer") val manufacturer: String = "",
    @SerializedName("model") val model: String = "",
    @SerializedName("totalRamMb") val totalRamMb: Long = 0L,
    @SerializedName("freeRamMb") val freeRamMb: Long = 0L,
    @SerializedName("totalStorageGb") val totalStorageGb: Float = 0f,
    @SerializedName("freeStorageGb") val freeStorageGb: Float = 0f,
    @SerializedName("uptimeSeconds") val uptimeSeconds: Long = 0L,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis()
)

data class EngineStatus(
    @SerializedName("isRunning") val isRunning: Boolean = false,
    @SerializedName("activeTasksCount") val activeTasksCount: Int = 0,
    @SerializedName("lastStartedAt") val lastStartedAt: Long = 0L,
    @SerializedName("mode") val mode: String = "STANDALONE"
)

data class HealthResponse(
    @SerializedName("status") val status: String = "healthy",
    @SerializedName("version") val version: String = "1.0.0",
    @SerializedName("serverTime") val serverTime: Long = System.currentTimeMillis(),
    @SerializedName("activeSessions") val activeSessions: Int = 0
)

data class HeartbeatRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("batteryLevel") val batteryLevel: Int,
    @SerializedName("isCharging") val isCharging: Boolean,
    @SerializedName("wifiIp") val wifiIp: String?,
    @SerializedName("tailscaleIp") val tailscaleIp: String?,
    @SerializedName("engineRunning") val engineRunning: Boolean,
    @SerializedName("accessibilityEnabled") val accessibilityEnabled: Boolean,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis()
)

data class ConnectivityTestResult(
    val isSuccess: Boolean,
    val latencyMs: Long,
    val statusCode: Int,
    val responseMessage: String,
    val endpointTested: String
)
