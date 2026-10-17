package com.example.intentgate

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class UnlockService : Service() {
    private val receiver = UnlockReceiver()

    override fun onCreate() {
        super.onCreate()
        val filter = IntentFilter(Intent.ACTION_USER_PRESENT)
        registerReceiver(receiver, filter)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel("gate_service", "IntentGate常駐", NotificationManager.IMPORTANCE_LOW)
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
            val notification: Notification = NotificationCompat.Builder(this, "gate_service")
                .setContentTitle("IntentGate 監視中")
                .setContentText("スマホの無意識な利用を防止しています")
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .build()
            startForeground(1, notification)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(receiver)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}