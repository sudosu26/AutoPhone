package com.phonepilot.app.service

import android.app.NotificationManager
import android.content.Context
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.phonepilot.app.PhonePilotApp
import com.phonepilot.app.R
import com.phonepilot.app.data.repository.DeviceRepository
import com.phonepilot.app.util.NetworkUtils
import java.util.concurrent.TimeUnit

class HealthCheckWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val deviceRepository = DeviceRepository.getInstance(context)

    override suspend fun doWork(): Result {
        Log.i(TAG, "Executing scheduled health check worker (runAttemptCount=$runAttemptCount)")

        if (!NetworkUtils.isNetworkAvailable(context)) {
            Log.w(TAG, "No internet/network available during health check. Will retry.")
            return Result.retry()
        }

        return try {
            val status = deviceRepository.refreshDeviceStatus()
            val heartbeatSent = deviceRepository.sendHeartbeat()

            Log.i(
                TAG,
                "Health check completed. Battery: ${status.batteryLevel}%, Charging: ${status.isCharging}, Heartbeat sent: $heartbeatSent"
            )

            // Alert user if battery is critically low (< 15%) and not charging
            if (status.batteryLevel < 15 && !status.isCharging) {
                notifyLowBattery(status.batteryLevel)
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Health check worker encountered error: ${e.message}", e)
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }

    private fun notifyLowBattery(batteryLevel: Int) {
        try {
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                    ?: return

            val notification = NotificationCompat.Builder(context, PhonePilotApp.CHANNEL_HEALTH_ID)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentTitle("PhonePilot Low Battery Warning")
                .setContentText("Device battery is at $batteryLevel%. Connect charger to maintain background automation.")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build()

            notificationManager.notify(NOTIFICATION_ID_BATTERY, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to post low battery notification: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "HealthCheckWorker"
        private const val WORK_NAME = "phonepilot_health_check_periodic"
        private const val NOTIFICATION_ID_BATTERY = 2001

        fun schedulePeriodic(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            // Minimum interval for periodic work in WorkManager is 15 minutes
            val periodicWork = PeriodicWorkRequestBuilder<HealthCheckWorker>(
                15, TimeUnit.MINUTES,
                5, TimeUnit.MINUTES // 5-minute flex window
            )
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                periodicWork
            )
            Log.i(TAG, "Enqueued periodic WorkManager health check (15m interval)")
        }
    }
}
