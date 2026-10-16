package com.phonepilot.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import com.phonepilot.app.service.HealthCheckWorker

class PhonePilotApp : Application() {

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Initializing PhonePilot Application...")

        // Configure Global Unhandled Exception Handler
        setupGlobalExceptionHandler()

        // Create Notification Channels for Android 8.0 (API 26) and above
        createNotificationChannels()

        // Enqueue periodic WorkManager background health monitoring
        try {
            HealthCheckWorker.schedulePeriodic(this)
            Log.i(TAG, "Periodic health check worker scheduled successfully.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule periodic health check worker: ${e.message}", e)
        }
    }

    private fun setupGlobalExceptionHandler() {
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e(TAG, "Uncaught exception in thread [${thread.name}]: ${throwable.message}", throwable)
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            val healthChannel = NotificationChannel(
                CHANNEL_HEALTH_ID,
                getString(R.string.channel_health_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = getString(R.string.channel_health_desc)
                enableLights(true)
                enableVibration(true)
            }

            val tasksChannel = NotificationChannel(
                CHANNEL_TASKS_ID,
                getString(R.string.channel_tasks_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.channel_tasks_desc)
                enableLights(true)
                enableVibration(true)
            }

            notificationManager.createNotificationChannels(listOf(healthChannel, tasksChannel))
            Log.i(TAG, "PhonePilot notification channels registered.")
        }
    }

    companion object {
        private const val TAG = "PhonePilotApp"

        const val CHANNEL_HEALTH_ID = "phonepilot_health_channel"
        const val CHANNEL_TASKS_ID = "phonepilot_tasks_channel"
    }
}
