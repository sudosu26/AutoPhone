package com.phonepilot.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.phonepilot.app.ui.theme.StatusError
import com.phonepilot.app.ui.theme.StatusSuccess
import com.phonepilot.app.ui.theme.StatusWarning

@Composable
fun ConnectivityIndicator(
    isConnected: Boolean,
    latencyMs: Long?,
    modifier: Modifier = Modifier
) {
    val indicatorColor by animateColorAsState(
        targetValue = when {
            isConnected && (latencyMs == null || latencyMs < 200) -> StatusSuccess
            isConnected -> StatusWarning
            else -> StatusError
        },
        label = "ConnectivityColor"
    )

    val labelText = when {
        isConnected && latencyMs != null -> "Connected (${latencyMs}ms)"
        isConnected -> "Connected"
        else -> "Server Offline"
    }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = indicatorColor.copy(alpha = 0.15f),
        contentColor = indicatorColor,
        modifier = modifier
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(indicatorColor)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = labelText,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp)
            )
        }
    }
}
