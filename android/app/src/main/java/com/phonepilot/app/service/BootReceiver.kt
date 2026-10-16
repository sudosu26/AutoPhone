package com.phonepilot.app.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.i(TAG, "BootReceiver triggered with action: $action")

        if (Intent.ACTION_BOOT_COMPLETED == action ||
            Intent.ACTION_MY_PACKAGE_REPLACED == action
        ) {
            // Re-schedule background periodic WorkManager worker upon system boot
            HealthCheckWorker.schedulePeriodic(context)
            Log.i(TAG, "PhonePilot health check worker scheduled successfully post-boot.")
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
