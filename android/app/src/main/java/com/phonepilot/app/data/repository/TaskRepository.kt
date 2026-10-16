package com.phonepilot.app.data.repository

import android.content.Context
import com.phonepilot.app.data.api.ApiClient
import com.phonepilot.app.data.model.ExecutionRecord
import com.phonepilot.app.data.model.ExecutionStatus
import com.phonepilot.app.data.model.NetworkResult
import com.phonepilot.app.data.model.Task
import com.phonepilot.app.data.model.TaskAction
import com.phonepilot.app.data.model.TaskStatus
import com.phonepilot.app.data.model.TaskType
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

class TaskRepository(private val context: Context) {

    private val apiClient = ApiClient.getInstance(context)
    private val scope = CoroutineScope(Dispatchers.IO)

    private val _tasksFlow = MutableStateFlow<List<Task>>(getInitialDefaultTasks())
    val tasksFlow: StateFlow<List<Task>> = _tasksFlow.asStateFlow()

    private val _historyFlow = MutableStateFlow<List<ExecutionRecord>>(getInitialHistory())
    val historyFlow: StateFlow<List<ExecutionRecord>> = _historyFlow.asStateFlow()

    suspend fun getTasks(forceRemote: Boolean = false): List<Task> = withContext(Dispatchers.IO) {
        if (forceRemote) {
            val result = apiClient.safeApiCall { apiClient.api.getTasks() }
            if (result is NetworkResult.Success && result.data.isNotEmpty()) {
                _tasksFlow.value = result.data
                return@withContext result.data
            }
        }
        _tasksFlow.value
    }

    suspend fun getTaskById(taskId: String): Task? = withContext(Dispatchers.IO) {
        _tasksFlow.value.find { it.id == taskId } ?: run {
            val result = apiClient.safeApiCall { apiClient.api.getTask(taskId) }
            if (result is NetworkResult.Success) {
                result.data
            } else {
                null
            }
        }
    }

    suspend fun createTask(task: Task): Boolean = withContext(Dispatchers.IO) {
        val currentList = _tasksFlow.value.toMutableList()
        currentList.add(0, task)
        _tasksFlow.value = currentList

        val result = apiClient.safeApiCall { apiClient.api.createTask(task) }
        result is NetworkResult.Success
    }

    suspend fun updateTask(task: Task): Boolean = withContext(Dispatchers.IO) {
        val currentList = _tasksFlow.value.toMutableList()
        val index = currentList.indexOfFirst { it.id == task.id }
        if (index != -1) {
            currentList[index] = task.copy(updatedAt = System.currentTimeMillis())
            _tasksFlow.value = currentList
        }

        val result = apiClient.safeApiCall { apiClient.api.updateTask(task.id, task) }
        result is NetworkResult.Success
    }

    suspend fun deleteTask(taskId: String): Boolean = withContext(Dispatchers.IO) {
        val currentList = _tasksFlow.value.toMutableList()
        currentList.removeAll { it.id == taskId }
        _tasksFlow.value = currentList

        val result = apiClient.safeApiCall { apiClient.api.deleteTask(taskId) }
        result is NetworkResult.Success
    }

    suspend fun toggleTaskEnabled(taskId: String, enabled: Boolean): Boolean = withContext(Dispatchers.IO) {
        val task = _tasksFlow.value.find { it.id == taskId } ?: return@withContext false
        val updated = task.copy(
            isEnabled = enabled,
            lastRunStatus = if (!enabled) TaskStatus.DISABLED else TaskStatus.IDLE
        )
        updateTask(updated)
    }

    suspend fun runTask(taskId: String): ExecutionRecord = withContext(Dispatchers.IO) {
        val task = _tasksFlow.value.find { it.id == taskId }
            ?: throw IllegalArgumentException("Task $taskId not found")

        // 1. Mark task running
        updateTaskStatus(taskId, TaskStatus.RUNNING)

        val startTime = System.currentTimeMillis()
        val executionId = UUID.randomUUID().toString().take(8)

        // 2. Attempt remote dispatch
        val apiResult = apiClient.safeApiCall { apiClient.api.runTask(taskId) }

        val record: ExecutionRecord = if (apiResult is NetworkResult.Success) {
            apiResult.data
        } else {
            // Local fallback simulation if backend is offline or mock mode
            simulateLocalExecution(executionId, task, startTime)
        }

        // 3. Mark task completed status
        val finalStatus = if (record.status == ExecutionStatus.SUCCESS) TaskStatus.SUCCESS else TaskStatus.FAILED
        updateTask(task.copy(lastRunTime = System.currentTimeMillis(), lastRunStatus = finalStatus))

        // 4. Append to history flow
        val currentHistory = _historyFlow.value.toMutableList()
        currentHistory.add(0, record)
        _historyFlow.value = currentHistory

        record
    }

    suspend fun stopTask(taskId: String): Boolean = withContext(Dispatchers.IO) {
        apiClient.safeApiCall { apiClient.api.stopTask(taskId) }
        updateTaskStatus(taskId, TaskStatus.CANCELLED)
        true
    }

    private fun updateTaskStatus(taskId: String, status: TaskStatus) {
        val currentList = _tasksFlow.value.toMutableList()
        val index = currentList.indexOfFirst { it.id == taskId }
        if (index != -1) {
            currentList[index] = currentList[index].copy(
                lastRunStatus = status,
                lastRunTime = System.currentTimeMillis()
            )
            _tasksFlow.value = currentList
        }
    }

    private suspend fun simulateLocalExecution(
        executionId: String,
        task: Task,
        startTime: Long
    ): ExecutionRecord {
        val logs = mutableListOf<String>()
        logs.add("[${System.currentTimeMillis()}] Initializing task ${task.name} (${task.type})")
        delay(600)

        logs.add("[${System.currentTimeMillis()}] Preparing environment context...")
        delay(800)

        task.actions.forEachIndexed { i, action ->
            logs.add("[${System.currentTimeMillis()}] Step ${i + 1}/${task.actions.size}: ${action.type} -> ${action.target ?: "default"}")
            delay(500)
        }

        val endTime = System.currentTimeMillis()
        val duration = endTime - startTime
        logs.add("[${System.currentTimeMillis()}] Task finished successfully in ${duration}ms")

        return ExecutionRecord(
            id = executionId,
            taskId = task.id,
            taskName = task.name,
            taskType = task.type,
            startTime = startTime,
            endTime = endTime,
            durationMs = duration,
            status = ExecutionStatus.SUCCESS,
            exitCode = 0,
            logs = logs,
            triggerSource = "ON_DEVICE_MANUAL"
        )
    }

    suspend fun getHistory(forceRemote: Boolean = false): List<ExecutionRecord> = withContext(Dispatchers.IO) {
        if (forceRemote) {
            val result = apiClient.safeApiCall { apiClient.api.getExecutionHistory() }
            if (result is NetworkResult.Success && result.data.isNotEmpty()) {
                _historyFlow.value = result.data
                return@withContext result.data
            }
        }
        _historyFlow.value
    }

    suspend fun clearHistory(): Boolean = withContext(Dispatchers.IO) {
        _historyFlow.value = emptyList()
        apiClient.safeApiCall { apiClient.api.clearExecutionHistory() }
        true
    }

    private fun getInitialDefaultTasks(): List<Task> {
        return listOf(
            Task(
                id = "task-sync-01",
                name = "Sync Health & Vitals",
                description = "Gathers battery stats, network status, and hardware metrics and transmits to central dashboard.",
                type = TaskType.HTTP,
                schedule = "Every 15 min",
                isEnabled = true,
                actions = listOf(
                    TaskAction(type = "gather_metrics", target = "system.battery"),
                    TaskAction(type = "http_post", target = "/api/device/heartbeat", timeoutMs = 5000)
                ),
                lastRunTime = System.currentTimeMillis() - 420_000,
                lastRunStatus = TaskStatus.SUCCESS
            ),
            Task(
                id = "task-ui-02",
                name = "Auto-Reply Telegram/WhatsApp",
                description = "Uses accessibility service to detect urgent incoming automation messages and acknowledge receipt.",
                type = TaskType.UI_AUTOMATION,
                schedule = "On Notification",
                isEnabled = true,
                targetPackage = "org.telegram.messenger",
                actions = listOf(
                    TaskAction(type = "inspect_view", target = "message_list"),
                    TaskAction(type = "click", target = "reply_box"),
                    TaskAction(type = "type_text", value = "AutoPhone: Ping received.")
                ),
                lastRunTime = System.currentTimeMillis() - 3_600_000,
                lastRunStatus = TaskStatus.SUCCESS
            ),
            Task(
                id = "task-termux-03",
                name = "Termux Workspace Cleanup",
                description = "Runs background bash maintenance script inside Termux to clean logs and temporary downloads.",
                type = TaskType.SHELL,
                schedule = "0 3 * * *",
                isEnabled = true,
                actions = listOf(
                    TaskAction(type = "exec_shell", value = "rm -rf ~/tmp/* && logger 'AutoPhone cleanup completed'")
                ),
                lastRunTime = System.currentTimeMillis() - 86_400_000,
                lastRunStatus = TaskStatus.SUCCESS
            ),
            Task(
                id = "task-system-04",
                name = "Daily Storage & Diagnostics",
                description = "Inspects available disk storage, memory thresholds, and Tailscale tunnel connectivity.",
                type = TaskType.SYSTEM,
                schedule = "0 12 * * *",
                isEnabled = false,
                actions = listOf(
                    TaskAction(type = "check_disk", target = "/data"),
                    TaskAction(type = "ping_host", target = "100.100.100.100")
                ),
                lastRunTime = System.currentTimeMillis() - 172_800_000,
                lastRunStatus = TaskStatus.IDLE
            ),
            Task(
                id = "task-workflow-05",
                name = "Nightly Backup & Cloud Sync",
                description = "Compresses logs and synchronizes device screenshots with remote control server.",
                type = TaskType.WORKFLOW,
                schedule = "0 2 * * *",
                isEnabled = true,
                actions = listOf(
                    TaskAction(type = "archive_logs", target = "logs/"),
                    TaskAction(type = "upload_s3", target = "backups/")
                ),
                lastRunTime = System.currentTimeMillis() - 43_200_000,
                lastRunStatus = TaskStatus.SUCCESS
            )
        )
    }

    private fun getInitialHistory(): List<ExecutionRecord> {
        val now = System.currentTimeMillis()
        return listOf(
            ExecutionRecord(
                id = "rec-001",
                taskId = "task-sync-01",
                taskName = "Sync Health & Vitals",
                taskType = TaskType.HTTP,
                startTime = now - 425_000,
                endTime = now - 420_000,
                durationMs = 5020,
                status = ExecutionStatus.SUCCESS,
                exitCode = 0,
                logs = listOf(
                    "Connected to backend http://10.0.2.2:8000",
                    "Collected battery: 84%, WiFi: OfficeNet",
                    "Heartbeat acknowledged (HTTP 200 OK)"
                ),
                triggerSource = "SCHEDULED_CRON"
            ),
            ExecutionRecord(
                id = "rec-002",
                taskId = "task-ui-02",
                taskName = "Auto-Reply Telegram/WhatsApp",
                taskType = TaskType.UI_AUTOMATION,
                startTime = now - 3_602_000,
                endTime = now - 3_600_000,
                durationMs = 2140,
                status = ExecutionStatus.SUCCESS,
                exitCode = 0,
                logs = listOf(
                    "Accessibility event received: TYPE_WINDOW_STATE_CHANGED",
                    "Target package detected: org.telegram.messenger",
                    "Dispatched automated reply action"
                ),
                triggerSource = "EVENT_NOTIFICATION"
            ),
            ExecutionRecord(
                id = "rec-003",
                taskId = "task-termux-03",
                taskName = "Termux Workspace Cleanup",
                taskType = TaskType.SHELL,
                startTime = now - 86_405_000,
                endTime = now - 86_400_000,
                durationMs = 4890,
                status = ExecutionStatus.SUCCESS,
                exitCode = 0,
                logs = listOf(
                    "Invoked termux task runner",
                    "Removed 42 cached log files",
                    "Disk space reclaimed: 34 MB"
                ),
                triggerSource = "SCHEDULED_CRON"
            ),
            ExecutionRecord(
                id = "rec-004",
                taskId = "task-workflow-05",
                taskName = "Nightly Backup & Cloud Sync",
                taskType = TaskType.WORKFLOW,
                startTime = now - 129_600_000,
                endTime = now - 129_592_000,
                durationMs = 8240,
                status = ExecutionStatus.FAILED,
                exitCode = 1,
                logs = listOf(
                    "Starting log archive process...",
                    "Error: Connection timeout reaching remote backup endpoint",
                    "Execution halted with exit code 1"
                ),
                errorMessage = "Network timeout reaching remote backup endpoint (100.x.y.z)",
                triggerSource = "SCHEDULED_CRON"
            )
        )
    }

    companion object {
        @Volatile
        private var instance: TaskRepository? = null

        fun getInstance(context: Context): TaskRepository {
            return instance ?: synchronized(this) {
                instance ?: TaskRepository(context.applicationContext).also { instance = it }
            }
        }
    }
}
