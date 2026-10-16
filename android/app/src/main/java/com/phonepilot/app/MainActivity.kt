package com.phonepilot.app

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.phonepilot.app.ui.navigation.PhonePilotBottomBar
import com.phonepilot.app.ui.navigation.PhonePilotNavHost
import com.phonepilot.app.ui.navigation.Screen
import com.phonepilot.app.ui.theme.PhonePilotTheme
import com.phonepilot.app.util.AppPreferences

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.i(TAG, "Starting PhonePilot MainActivity...")

        setContent {
            val appPreferences = remember { AppPreferences.getInstance(applicationContext) }
            val themeMode by appPreferences.themeModeFlow.collectAsState()

            val isDarkTheme = when (themeMode) {
                AppPreferences.THEME_LIGHT -> false
                AppPreferences.THEME_DARK -> true
                else -> isSystemInDarkTheme()
            }

            PhonePilotTheme(darkTheme = isDarkTheme) {
                MainAppScreen(intent = intent)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    companion object {
        private const val TAG = "MainActivity"
    }
}

@Composable
private fun MainAppScreen(intent: Intent?, modifier: Modifier = Modifier) {
    val navController = rememberNavController()

    // Request Android 13+ Notification Runtime Permission on launch
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        Log.d("MainActivity", "Notification permission granted: $isGranted")
    }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    // Handle deep links and navigation intents
    LaunchedEffect(intent) {
        intent?.data?.let { uri ->
            when {
                uri.host == "task" && uri.pathSegments.isNotEmpty() -> {
                    val taskId = uri.pathSegments.first()
                    navController.navigate(Screen.TaskDetail.createRoute(taskId))
                }
                uri.host == "tasks" -> {
                    navController.navigate(Screen.Tasks.route)
                }
                uri.host == "history" -> {
                    navController.navigate(Screen.History.route)
                }
                uri.host == "settings" -> {
                    navController.navigate(Screen.Settings.route)
                }
                uri.host == "diagnostics" -> {
                    navController.navigate(Screen.Diagnostics.route)
                }
            }
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        bottomBar = {
            PhonePilotBottomBar(navController = navController)
        }
    ) { innerPadding ->
        PhonePilotNavHost(
            navController = navController,
            modifier = Modifier.padding(innerPadding)
        )
    }
}
