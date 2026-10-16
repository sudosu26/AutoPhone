package com.phonepilot.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.phonepilot.app.data.model.ExecutionRecord
import com.phonepilot.app.data.model.Task
import com.phonepilot.app.data.model.TaskType
import com.phonepilot.app.data.repository.TaskRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class TasksViewModel(
    application: Application,
    private val taskRepository: TaskRepository = TaskRepository.getInstance(application)
) : AndroidViewModel(application) {

    val tasks: StateFlow<List<Task>> = taskRepository.tasksFlow
    val history: StateFlow<List<ExecutionRecord>> = taskRepository.historyFlow

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedTypeFilter = MutableStateFlow<TaskType?>(null)
    val selectedTypeFilter: StateFlow<TaskType?> = _selectedTypeFilter.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _runningTaskId = MutableStateFlow<String?>(null)
    val runningTaskId: StateFlow<String?> = _runningTaskId.asStateFlow()

    val filteredTasks: StateFlow<List<Task>> = combine(
        taskRepository.tasksFlow,
        _searchQuery,
        _selectedTypeFilter
    ) { allTasks, query, typeFilter ->
        allTasks.filter { task ->
            val matchesQuery = query.isBlank() ||
                    task.name.contains(query, ignoreCase = true) ||
                    task.description.contains(query, ignoreCase = true) ||
                    (task.targetPackage?.contains(query, ignoreCase = true) == true)
            val matchesType = typeFilter == null || task.type == typeFilter
            matchesQuery && matchesType
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        loadTasks()
    }

    fun loadTasks(forceRemote: Boolean = false) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                taskRepository.getTasks(forceRemote = forceRemote)
            } catch (e: Exception) {
                _error.value = "Failed to load tasks: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun searchTasks(query: String) {
        _searchQuery.value = query
    }

    fun filterByType(type: TaskType?) {
        _selectedTypeFilter.value = type
    }

    fun runTask(taskId: String) {
        viewModelScope.launch {
            try {
                _runningTaskId.value = taskId
                taskRepository.runTask(taskId)
            } catch (e: Exception) {
                _error.value = "Execution failed: ${e.message}"
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
                _error.value = "Failed to update task status: ${e.message}"
            }
        }
    }

    fun deleteTask(taskId: String) {
        viewModelScope.launch {
            try {
                taskRepository.deleteTask(taskId)
            } catch (e: Exception) {
                _error.value = "Failed to delete task: ${e.message}"
            }
        }
    }

    fun createTask(task: Task) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                taskRepository.createTask(task)
            } catch (e: Exception) {
                _error.value = "Failed to create task: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateTask(task: Task) {
        viewModelScope.launch {
            try {
                taskRepository.updateTask(task)
            } catch (e: Exception) {
                _error.value = "Failed to update task: ${e.message}"
            }
        }
    }

    fun clearHistory() {
        viewModelScope.launch {
            try {
                taskRepository.clearHistory()
            } catch (e: Exception) {
                _error.value = "Failed to clear history: ${e.message}"
            }
        }
    }

    fun refreshHistory() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                taskRepository.getHistory(forceRemote = true)
            } catch (e: Exception) {
                _error.value = "Failed to refresh history: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
