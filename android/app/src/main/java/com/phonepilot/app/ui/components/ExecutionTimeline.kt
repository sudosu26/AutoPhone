package com.phonepilot.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.phonepilot.app.data.model.ExecutionRecord
import com.phonepilot.app.data.model.ExecutionStatus
import com.phonepilot.app.ui.theme.StatusDisabled
import com.phonepilot.app.ui.theme.StatusError
import com.phonepilot.app.ui.theme.StatusErrorContainer
import com.phonepilot.app.ui.theme.StatusRunning
import com.phonepilot.app.ui.theme.StatusSuccess
import com.phonepilot.app.ui.theme.StatusWarning
import com.phonepilot.app.util.NetworkUtils
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun ExecutionTimeline(
    records: List<ExecutionRecord>,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        records.forEachIndexed { index, record ->
            ExecutionTimelineItem(
                record = record,
                isLast = index == records.lastIndex
            )
        }
    }
}

@Composable
fun ExecutionTimelineItem(
    record: ExecutionRecord,
    isLast: Boolean,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }

    val statusColor = when (record.status) {
        ExecutionStatus.SUCCESS -> StatusSuccess
        ExecutionStatus.FAILED -> StatusError
        ExecutionStatus.RUNNING -> StatusRunning
        ExecutionStatus.TIMEOUT -> StatusWarning
        ExecutionStatus.CANCELLED -> StatusDisabled
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
    ) {
        // Vertical indicator column
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(32.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = statusColor,
                modifier = Modifier
                    .padding(top = 16.dp)
                    .size(12.dp)
            ) {}

            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .weight(1f)
                        .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.25f))
                )
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        // Card Content
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
            ),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)),
            modifier = Modifier
                .padding(vertical = 6.dp)
                .fillMaxWidth()
                .clickable { isExpanded = !isExpanded }
        ) {
            Column(
                modifier = Modifier
                    .padding(14.dp)
                    .fillMaxWidth()
            ) {
                // Header row
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = record.taskName,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )

                    ExecutionStatusBadge(status = record.status)
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Time + Duration + Trigger
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val dateFormatted = SimpleDateFormat("MMM d, HH:mm:ss", Locale.getDefault())
                        .format(Date(record.startTime))

                    Text(
                        text = dateFormatted,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.width(10.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Timer,
                            contentDescription = "Duration",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = NetworkUtils.formatDuration(record.durationMs),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    Icon(
                        imageVector = if (isExpanded) Icons.Default.ExpandMore else Icons.Default.ChevronRight,
                        contentDescription = "Expand",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Error message banner if present
                if (!record.errorMessage.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = StatusErrorContainer.copy(alpha = 0.35f),
                        border = BorderStroke(1.dp, StatusError.copy(alpha = 0.4f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = record.errorMessage,
                            style = MaterialTheme.typography.bodySmall,
                            color = StatusError,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                }

                // Expandable detailed logs
                AnimatedVisibility(
                    visible = isExpanded,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically()
                ) {
                    Column(
                        modifier = Modifier
                            .padding(top = 12.dp)
                            .fillMaxWidth()
                    ) {
                        Text(
                            text = "Execution Logs (Exit code: ${record.exitCode ?: 0}, Trigger: ${record.triggerSource})",
                            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(6.dp))

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF070E1A),
                            border = BorderStroke(1.dp, Color(0xFF1E293B)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                if (record.logs.isEmpty()) {
                                    Text(
                                        text = "No detailed stdout logs captured.",
                                        style = MaterialTheme.typography.bodySmall.copy(
                                            fontFamily = FontFamily.Monospace,
                                            fontSize = 11.sp
                                        ),
                                        color = Color(0xFF94A3B8)
                                    )
                                } else {
                                    record.logs.forEach { logLine ->
                                        Text(
                                            text = logLine,
                                            style = MaterialTheme.typography.bodySmall.copy(
                                                fontFamily = FontFamily.Monospace,
                                                fontSize = 11.sp,
                                                lineHeight = 16.sp
                                            ),
                                            color = Color(0xFFCBD5E1)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ExecutionStatusBadge(status: ExecutionStatus, modifier: Modifier = Modifier) {
    val (label, color) = when (status) {
        ExecutionStatus.SUCCESS -> Pair("Success", StatusSuccess)
        ExecutionStatus.FAILED -> Pair("Failed", StatusError)
        ExecutionStatus.RUNNING -> Pair("Running", StatusRunning)
        ExecutionStatus.TIMEOUT -> Pair("Timeout", StatusWarning)
        ExecutionStatus.CANCELLED -> Pair("Cancelled", StatusDisabled)
    }

    Surface(
        shape = RoundedCornerShape(6.dp),
        color = color.copy(alpha = 0.15f),
        contentColor = color,
        modifier = modifier
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 11.sp
            ),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
        )
    }
}
