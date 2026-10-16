package com.phonepilot.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.phonepilot.app.data.model.ExecutionRecord
import com.phonepilot.app.data.model.ExecutionStatus
import com.phonepilot.app.ui.components.ExecutionTimelineItem
import com.phonepilot.app.ui.theme.StatusError
import com.phonepilot.app.ui.theme.StatusRunning
import com.phonepilot.app.ui.theme.StatusSuccess
import com.phonepilot.app.ui.theme.StatusWarning
import com.phonepilot.app.ui.viewmodel.TasksViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    onNavigateToTaskDetail: ((String) -> Unit)? = null,
    viewModel: TasksViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val history by viewModel.history.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    var selectedStatusFilter by remember { mutableStateOf<ExecutionStatus?>(null) }
    var showClearConfirmDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    val filteredRecords = remember(history, selectedStatusFilter) {
        if (selectedStatusFilter == null) history
        else history.filter { it.status == selectedStatusFilter }
    }

    val totalCount = history.size
    val successCount = history.count { it.status == ExecutionStatus.SUCCESS }
    val failedCount = history.count { it.status == ExecutionStatus.FAILED }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Execution History",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                },
                actions = {
                    if (history.isNotEmpty()) {
                        IconButton(onClick = { showClearConfirmDialog = true }) {
                            Icon(
                                imageVector = Icons.Default.DeleteSweep,
                                contentDescription = "Clear History",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    IconButton(
                        onClick = { viewModel.refreshHistory() },
                        enabled = !isLoading
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.primary
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Refresh",
                                tint = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            AnimatedVisibility(visible = isLoading, enter = fadeIn(), exit = fadeOut()) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary
                )
            }

            // Summary Stats Strip
            if (history.isNotEmpty()) {
                HistoryStatsStrip(
                    total = totalCount,
                    success = successCount,
                    failed = failedCount,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }

            // Filter Chips
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilterChip(
                    selected = selectedStatusFilter == null,
                    onClick = { selectedStatusFilter = null },
                    label = { Text("All ($totalCount)") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedLabelColor = MaterialTheme.colorScheme.primary
                    )
                )

                FilterChip(
                    selected = selectedStatusFilter == ExecutionStatus.SUCCESS,
                    onClick = {
                        selectedStatusFilter = if (selectedStatusFilter == ExecutionStatus.SUCCESS) null else ExecutionStatus.SUCCESS
                    },
                    label = { Text("Completed ($successCount)") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = StatusSuccess.copy(alpha = 0.2f),
                        selectedLabelColor = StatusSuccess
                    )
                )

                FilterChip(
                    selected = selectedStatusFilter == ExecutionStatus.FAILED,
                    onClick = {
                        selectedStatusFilter = if (selectedStatusFilter == ExecutionStatus.FAILED) null else ExecutionStatus.FAILED
                    },
                    label = { Text("Failed ($failedCount)") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = StatusError.copy(alpha = 0.2f),
                        selectedLabelColor = StatusError
                    )
                )

                FilterChip(
                    selected = selectedStatusFilter == ExecutionStatus.RUNNING,
                    onClick = {
                        selectedStatusFilter = if (selectedStatusFilter == ExecutionStatus.RUNNING) null else ExecutionStatus.RUNNING
                    },
                    label = { Text("Running") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = StatusRunning.copy(alpha = 0.2f),
                        selectedLabelColor = StatusRunning
                    )
                )

                FilterChip(
                    selected = selectedStatusFilter == ExecutionStatus.CANCELLED,
                    onClick = {
                        selectedStatusFilter = if (selectedStatusFilter == ExecutionStatus.CANCELLED) null else ExecutionStatus.CANCELLED
                    },
                    label = { Text("Cancelled") }
                )
            }

            // History List or Empty State
            if (filteredRecords.isEmpty() && !isLoading) {
                EmptyHistoryState(
                    hasFilter = selectedStatusFilter != null,
                    onResetFilter = { selectedStatusFilter = null }
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    itemsIndexed(
                        items = filteredRecords,
                        key = { _, item -> item.id }
                    ) { index, record ->
                        ExecutionTimelineItem(
                            record = record,
                            isLast = index == filteredRecords.lastIndex
                        )
                    }
                }
            }
        }
    }

    // Clear Confirmation Dialog
    if (showClearConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showClearConfirmDialog = false },
            title = { Text("Clear All Execution History") },
            text = { Text("Are you sure you want to remove all logs and execution timestamps? This cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.clearHistory()
                        showClearConfirmDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = StatusError)
                ) {
                    Text("Clear All")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearConfirmDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun HistoryStatsStrip(
    total: Int,
    success: Int,
    failed: Int,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 10.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.History,
                    contentDescription = "Total",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "$total runs",
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Success",
                    tint = StatusSuccess,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "$success passed",
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                    color = StatusSuccess
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Error,
                    contentDescription = "Failed",
                    tint = StatusError,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "$failed failed",
                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                    color = StatusError
                )
            }
        }
    }
}

@Composable
private fun EmptyHistoryState(
    hasFilter: Boolean,
    onResetFilter: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp)
    ) {
        Icon(
            imageVector = Icons.Default.History,
            contentDescription = "No History",
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(54.dp)
        )
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = if (hasFilter) "No executions match this filter" else "No execution records found",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = if (hasFilter) "Try switching filter chips to view all executions"
            else "Triggered tasks will display detailed logs, exit codes, and timestamps here.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        if (hasFilter) {
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedButton(onClick = onResetFilter) {
                Text("Show All")
            }
        }
    }
}
