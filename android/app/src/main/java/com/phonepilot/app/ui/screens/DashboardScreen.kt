package com.phonepilot.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BatteryChargingFull
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Lan
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.VpnKey
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.phonepilot.app.data.model.DeviceStatus
import com.phonepilot.app.data.model.ExecutionRecord
import com.phonepilot.app.data.model.ExecutionStatus
import com.phonepilot.app.data.model.Task
import com.phonepilot.app.ui.components.ConnectivityIndicator
import com.phonepilot.app.ui.components.ExecutionTimeline
import com.phonepilot.app.ui.components.PermissionBanner
import com.phonepilot.app.ui.theme.StatusError
import com.phonepilot.app.ui.theme.StatusRunning
import com.phonepilot.app.ui.theme.StatusSuccess
import com.phonepilot.app.ui.theme.StatusWarning
import com.phonepilot.app.ui.viewmodel.DashboardViewModel
import com.phonepilot.app.util.PermissionHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToTaskDetail: (String) -> Unit,
    onNavigateToDiagnostics: () -> Unit,
    onNavigateToTasks: () -> Unit,
    viewModel: DashboardViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val tasks by viewModel.tasks.collectAsState()
    val deviceStatus by viewModel.deviceStatus.collectAsState()
    val isConnected by viewModel.isBackendConnected.collectAsState()
    val backendLatency by viewModel.backendLatency.collectAsState()
    val recentExecutions by viewModel.recentExecutions.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val runningTaskId by viewModel.runningTaskId.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    val isA11yGranted = remember(deviceStatus) {
        PermissionHelper.isAccessibilityServiceEnabled(context)
    }
    val isBatteryOptimized = remember(deviceStatus) {
        PermissionHelper.isIgnoringBatteryOptimizations(context)
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "PhonePilot",
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = deviceStatus.deviceName.ifBlank { "Android Node" },
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    ConnectivityIndicator(
                        isConnected = isConnected,
                        latencyMs = backendLatency,
                        modifier = Modifier.padding(end = 6.dp)
                    )
                    IconButton(
                        onClick = { viewModel.refresh(showLoadingIndicator = true) },
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
                .verticalScroll(rememberScrollState())
        ) {
            // Optional Loading Bar
            AnimatedVisibility(
                visible = isLoading,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                // Permission alerts if critical permissions are missing
                if (!isA11yGranted) {
                    PermissionBanner(
                        title = "Accessibility Required",
                        description = "Enable service to automate taps, inputs, and UI workflows.",
                        actionLabel = "Enable",
                        onActionClick = {
                            context.startActivity(PermissionHelper.getAccessibilitySettingsIntent())
                        }
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }

                if (!isBatteryOptimized) {
                    PermissionBanner(
                        title = "Battery Optimization Active",
                        description = "Whitelist PhonePilot so background heartbeats are never killed.",
                        actionLabel = "Exempt",
                        onActionClick = {
                            context.startActivity(PermissionHelper.getBatteryOptimizationIntent(context))
                        }
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }

                // Automation Engine Master Switch Card
                EngineMasterCard(
                    isEngineRunning = deviceStatus.engineRunning,
                    onToggleEngine = { viewModel.toggleEngine(it) }
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Stats Row: Total Tasks, Active, Success Rate
                DashboardStatsRow(
                    tasks = tasks,
                    recentExecutions = recentExecutions
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Device Vitals Card
                DeviceVitalsSummaryCard(
                    status = deviceStatus,
                    onOpenDiagnostics = onNavigateToDiagnostics
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Quick Action Bar
                QuickActionsRow(
                    onSyncHealth = {
                        val syncTask = tasks.find { it.id == "task-sync-01" }
                        if (syncTask != null) {
                            viewModel.runTask(syncTask.id)
                        } else {
                            viewModel.refresh(showLoadingIndicator = true)
                        }
                    },
                    onOpenDiagnostics = onNavigateToDiagnostics,
                    onOpenTasks = onNavigateToTasks,
                    isSyncRunning = runningTaskId == "task-sync-01"
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Recent Executions Section
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Recent Executions",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    TextButton(onClick = onNavigateToTasks) {
                        Text(
                            text = "View Tasks",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (recentExecutions.isEmpty()) {
                    EmptyExecutionsCard()
                } else {
                    ExecutionTimeline(records = recentExecutions)
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun EngineMasterCard(
    isEngineRunning: Boolean,
    onToggleEngine: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isEngineRunning) {
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
            } else {
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
            }
        ),
        border = BorderStroke(
            1.dp,
            if (isEngineRunning) MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
            else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
        ),
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .fillMaxWidth()
        ) {
            Surface(
                shape = CircleShape,
                color = if (isEngineRunning) StatusSuccess.copy(alpha = 0.2f) else StatusWarning.copy(alpha = 0.2f),
                modifier = Modifier.size(40.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.PowerSettingsNew,
                        contentDescription = "Engine Power",
                        tint = if (isEngineRunning) StatusSuccess else StatusWarning,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Automation Engine",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = if (isEngineRunning) "Active • Listening for triggers" else "Engine Paused",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Switch(
                checked = isEngineRunning,
                onCheckedChange = onToggleEngine,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = MaterialTheme.colorScheme.primary,
                    checkedTrackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.4f)
                )
            )
        }
    }
}

@Composable
private fun DashboardStatsRow(
    tasks: List<Task>,
    recentExecutions: List<ExecutionRecord>,
    modifier: Modifier = Modifier
) {
    val totalTasks = tasks.size
    val activeTasks = tasks.count { it.isEnabled }
    val completedRecords = recentExecutions.filter {
        it.status == ExecutionStatus.SUCCESS || it.status == ExecutionStatus.FAILED
    }
    val successRate = if (completedRecords.isNotEmpty()) {
        val successes = completedRecords.count { it.status == ExecutionStatus.SUCCESS }
        "${(successes * 100) / completedRecords.size}%"
    } else {
        "100%"
    }

    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        StatBox(
            title = "Total Tasks",
            value = totalTasks.toString(),
            icon = Icons.Default.Layers,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.weight(1f)
        )
        StatBox(
            title = "Active",
            value = activeTasks.toString(),
            icon = Icons.Default.CheckCircle,
            tint = StatusSuccess,
            modifier = Modifier.weight(1f)
        )
        StatBox(
            title = "Success Rate",
            value = successRate,
            icon = Icons.Default.TrendingUp,
            tint = Color(0xFF06B6D4),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun StatBox(
    title: String,
    value: String,
    icon: ImageVector,
    tint: Color,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth()
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = tint,
                    modifier = Modifier.size(16.dp)
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 22.sp
                ),
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
private fun DeviceVitalsSummaryCard(
    status: DeviceStatus,
    onOpenDiagnostics: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
        modifier = modifier
            .fillMaxWidth()
            .clickable { onOpenDiagnostics() }
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Speed,
                        contentDescription = "Device Vitals",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Device Vitals & Telemetry",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "Diagnostics",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Vital items grid
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                VitalItem(
                    icon = Icons.Default.BatteryChargingFull,
                    title = "Battery",
                    value = "${status.batteryLevel}%",
                    subtitle = if (status.isCharging) "Charging" else "${status.batteryTemp}°C",
                    tint = if (status.batteryLevel > 20) StatusSuccess else StatusError
                )

                VitalItem(
                    icon = Icons.Default.Wifi,
                    title = "WiFi",
                    value = if (status.wifiConnected) (status.wifiSsid ?: "Connected") else "No WiFi",
                    subtitle = status.wifiIp ?: "Offline",
                    tint = if (status.wifiConnected) StatusSuccess else StatusWarning
                )

                VitalItem(
                    icon = Icons.Default.VpnKey,
                    title = "Tailscale",
                    value = if (status.tailscaleActive) "Active" else "Inactive",
                    subtitle = status.tailscaleIp ?: "Disconnected",
                    tint = if (status.tailscaleActive) Color(0xFF38BDF8) else Color(0xFF64748B)
                )

                VitalItem(
                    icon = Icons.Default.Memory,
                    title = "RAM",
                    value = "${status.freeRamMb}M",
                    subtitle = "${status.totalRamMb}M total",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun VitalItem(
    icon: ImageVector,
    title: String,
    value: String,
    subtitle: String,
    tint: Color,
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
    ) {
        Icon(
            imageVector = icon,
            contentDescription = title,
            tint = tint,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
        )
    }
}

@Composable
private fun QuickActionsRow(
    onSyncHealth: () -> Unit,
    onOpenDiagnostics: () -> Unit,
    onOpenTasks: () -> Unit,
    isSyncRunning: Boolean,
    modifier: Modifier = Modifier
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Button(
            onClick = onSyncHealth,
            enabled = !isSyncRunning,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            if (isSyncRunning) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Icon(
                    imageVector = Icons.Default.Sync,
                    contentDescription = "Sync",
                    modifier = Modifier.size(16.dp)
                )
            }
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = if (isSyncRunning) "Syncing" else "Sync Vitals",
                style = MaterialTheme.typography.labelMedium
            )
        }

        OutlinedButton(
            onClick = onOpenDiagnostics,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            Icon(
                imageVector = Icons.Default.Lan,
                contentDescription = "Diagnostics",
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(text = "Diagnostics", style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
private fun EmptyExecutionsCard(modifier: Modifier = Modifier) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .padding(24.dp)
                .fillMaxWidth()
        ) {
            Text(
                text = "No executions recorded yet",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Run a task to see live execution logs and timeline status.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
            )
        }
    }
}
