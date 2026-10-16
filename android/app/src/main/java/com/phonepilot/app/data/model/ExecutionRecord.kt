package com.phonepilot.app.data.model

import com.google.gson.annotations.SerializedName

enum class ExecutionStatus {
    @SerializedName("running")
    RUNNING,

    @SerializedName("success")
    SUCCESS,

    @SerializedName("failed")
    FAILED,

    @SerializedName("cancelled")
    CANCELLED,

    @SerializedName("timeout")
    TIMEOUT
}

data class ExecutionRecord(
    @SerializedName("id") val id: String,
    @SerializedName("taskId") val taskId: String,
    @SerializedName("taskName") val taskName: String,
    @SerializedName("taskType") val taskType: TaskType,
    @SerializedName("startTime") val startTime: Long,
    @SerializedName("endTime") val endTime: Long? = null,
    @SerializedName("durationMs") val durationMs: Long = 0L,
    @SerializedName("status") val status: ExecutionStatus,
    @SerializedName("exitCode") val exitCode: Int? = null,
    @SerializedName("logs") val logs: List<String> = emptyList(),
    @SerializedName("errorMessage") val errorMessage: String? = null,
    @SerializedName("triggerSource") val triggerSource: String = "MANUAL"
)
