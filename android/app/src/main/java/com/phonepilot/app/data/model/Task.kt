package com.phonepilot.app.data.model

import com.google.gson.annotations.SerializedName

enum class TaskType {
    @SerializedName("ui_automation")
    UI_AUTOMATION,

    @SerializedName("shell")
    SHELL,

    @SerializedName("http")
    HTTP,

    @SerializedName("system")
    SYSTEM,

    @SerializedName("workflow")
    WORKFLOW
}

enum class TaskStatus {
    @SerializedName("idle")
    IDLE,

    @SerializedName("running")
    RUNNING,

    @SerializedName("success")
    SUCCESS,

    @SerializedName("failed")
    FAILED,

    @SerializedName("disabled")
    DISABLED,

    @SerializedName("cancelled")
    CANCELLED
}

data class TaskAction(
    @SerializedName("type") val type: String = "click",
    @SerializedName("target") val target: String? = null,
    @SerializedName("value") val value: String? = null,
    @SerializedName("delayMs") val delayMs: Long = 0L,
    @SerializedName("timeoutMs") val timeoutMs: Long = 10000L
)

data class Task(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String,
    @SerializedName("type") val type: TaskType,
    @SerializedName("schedule") val schedule: String? = null,
    @SerializedName("isEnabled") val isEnabled: Boolean = true,
    @SerializedName("targetPackage") val targetPackage: String? = null,
    @SerializedName("actions") val actions: List<TaskAction> = emptyList(),
    @SerializedName("parameters") val parameters: Map<String, String> = emptyMap(),
    @SerializedName("lastRunTime") val lastRunTime: Long? = null,
    @SerializedName("lastRunStatus") val lastRunStatus: TaskStatus = TaskStatus.IDLE,
    @SerializedName("createdAt") val createdAt: Long = System.currentTimeMillis(),
    @SerializedName("updatedAt") val updatedAt: Long = System.currentTimeMillis()
)
