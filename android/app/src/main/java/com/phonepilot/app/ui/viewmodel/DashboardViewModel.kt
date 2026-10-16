package com.phonepilot.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.phonepilot.app.data.model.DeviceStatus
import com.phonepilot.app.data.model.ExecutionRecord
import com.phonepilot.app.data.model.Task
import com.phonepilot.app.data.repository.DeviceRepository
import com.phonepilot.app.data.repository.TaskRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class DashboardViewModel(
    application: Application,
    private val taskRepository: TaskRepository = TaskRepository.getInstance(application),
    private val deviceRepository: DeviceRepository = DeviceRepository.getInstance(application)
) : AndroidViewModel(application) {

    val tasks: StateFlow<List<Task>> = taskRepository.tasksFlow
    val deviceStatus: StateFlow<DeviceStatus> = deviceRepository.deviceStatusFlow
    val isBackendConnected: StateFlow<Boolean> = deviceRepository.isBackendConnected
    val backendLatency: StateFlow<Long?> = deviceRepository.backendLatency

    val recentExecutions: StateFlow<List<ExecutionRecord>> = taskRepository.historyFlow
        .map { records -> records.take(5) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _runningTaskId = MutableStateFlow<String?>(null)
    val runningTaskId: StateFlow<String?> = _runningTaskId.asStateFlow()

    private var autoRefreshJob: Job? = null

    init {
        startAutoRefresh()
    }

    fun refresh(showLoadingIndicator: Boolean = true) {
        viewModelScope.launch {
            if (showLoadingIndicator) {
                _isLoading.value = true
            }
            try {
                deviceRepository.refreshDeviceStatus()
                deviceRepository.checkBackendHealth()
                taskRepository.getTasks(forceRemote = true)
                taskRepository.getHistory(forceRemote = true)
            } catch (e: Exception) {
                _errorMessage.value = "Failed to refresh dashboard: ${e.message}"
            } finally {
                if (showLoadingIndicator) {
                    _isLoading.value = false
                }
            }
        }
    }

    fun runTask(taskId: String) {
        viewModelScope.launch {
            try {
                _runningTaskId.value = taskId
                taskRepository.runTask(taskId)
            } catch (e: Exception) {
                _errorMessage.value = "Failed to run task: ${e.message}"
            } finally {
                _runningTaskId.value = null
            }
        }
    }

    fun toggleTask(taskId: String, enabled: Boolean) {
        viewModelScope.launch {
            try {
                taskRepository.toggleTaskEnabled(taskId, enabled)
            } catch (e: Exception) {
                _errorMessage.value = "Failed to update task: ${e.message}"
            }
        }
    }

    fun toggleEngine(enabled: Boolean) {
        deviceRepository.setEngineRunning(enabled)
    }

    fun clearError() {
        _errorMessage.value = null
    }

    private fun startAutoRefresh() {
        autoRefreshJob?.cancel()
        autoRefreshJob = viewModelScope.launch {
            while (isActive) {
                delay(30_000L)
                refresh(showLoadingIndicator = false)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        autoRefreshJob?.cancel()
    }
}
