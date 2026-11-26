package com.example.intentgate

import android.annotation.SuppressLint
import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/**
 * IntentGate - 制限対象アプリの起動を検知して自動割り込みするフォアグラウンドサービス
 */
class UnlockService : Service() {

    private val unlockReceiver = UnlockReceiver()
    private var isReceiverRegistered = false
    private val monitorHandler = Handler(Looper.getMainLooper())
    private var lastInterceptTime = 0L
    private var lastDetectedForegroundPkg: String? = null

    private val monitorRunnable = object : Runnable {
        override fun run() {
            try {
                checkForegroundAppLaunch()
            } catch (e: Exception) {
                Log.w(TAG, "Foreground monitor check error", e)
            } finally {
                monitorHandler.postDelayed(this, POLL_INTERVAL_MS)
            }
        }
    }

    companion object {
        private const val TAG = "IntentGateMonitor"
        private const val POLL_INTERVAL_MS = 500L
        private const val INTERCEPT_DEBOUNCE_MS = 1500L
        private const val SESSION_LEAVE_GRACE_MS = 2500L

        const val CHANNEL_ID = "intentgate_monitor_channel"
        const val NOTIFICATION_ID = 1001

        fun start(context: Context) {
            val intent = Intent(context, UnlockService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification())
        registerScreenReceiver()
        monitorHandler.post(monitorRunnable)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun registerScreenReceiver() {
        if (!isReceiverRegistered) {
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_OFF)
                addAction(Intent.ACTION_USER_PRESENT)
            }
            registerReceiver(unlockReceiver, filter)
            isReceiverRegistered = true
        }
    }

    private fun checkForegroundAppLaunch() {
        if (!MainActivity.isGateEnabled(this)) return
        if (!MainActivity.hasUsageStatsPermission(this)) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) return

        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        if (powerManager?.isInteractive == false) return

        val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
        if (keyguardManager?.isKeyguardLocked == true) return

        val foregroundPkg = queryCurrentForegroundPackage() ?: return
        val now = System.currentTimeMillis()

        // 自アプリ表示中は処理しない
        if (foregroundPkg == packageName) {
            lastDetectedForegroundPkg = foregroundPkg
            return
        }

        // クイズを解いて許可されたセッション中のアプリなら割り込まず継続利用を許可
        val unlockedPkg = MainActivity.unlockedSessionPackage
        if (unlockedPkg != null) {
            if (foregroundPkg == unlockedPkg) {
                MainActivity.lastSeenUnlockedAppAt = now
                lastDetectedForegroundPkg = foregroundPkg
                return
            } else if (now - MainActivity.lastSeenUnlockedAppAt > SESSION_LEAVE_GRACE_MS) {
                // 別アプリまたはホーム画面へ移ってから一定時間経過したらセッション許可を解除
                MainActivity.clearUnlockedSession()
            } else {
                return
            }
        }

        val restricted = MainActivity.getRestrictedPackages(this)
        if (!restricted.contains(foregroundPkg)) {
            lastDetectedForegroundPkg = foregroundPkg
            return
        }

        // 同じアプリに対して短時間に連続割り込みしないようデバウンス
        if (foregroundPkg == lastDetectedForegroundPkg && now - lastInterceptTime < INTERCEPT_DEBOUNCE_MS) {
            return
        }
        if (now - lastInterceptTime < INTERCEPT_DEBOUNCE_MS) {
            return
        }

        lastDetectedForegroundPkg = foregroundPkg
        lastInterceptTime = now

        val appLabel = try {
            val appInfo = packageManager.getApplicationInfo(foregroundPkg, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            foregroundPkg
        }

        val launchIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            )
            putExtra(MainActivity.EXTRA_TARGET_PACKAGE, foregroundPkg)
            putExtra(MainActivity.EXTRA_TARGET_APP_NAME, appLabel)
        }
        startActivity(launchIntent)
        Log.i(TAG, "Intercepted restricted app launch: $foregroundPkg ($appLabel)")
    }

    private fun queryCurrentForegroundPackage(): String? {
        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return null
        val endTime = System.currentTimeMillis()
        val startTime = endTime - 4000L
        val events = usageStatsManager.queryEvents(startTime, endTime) ?: return null
        val event = UsageEvents.Event()

        var latestPkg: String? = null
        var latestTime = 0L

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val isForegroundEvent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                event.eventType == UsageEvents.Event.ACTIVITY_RESUMED
            } else {
                @Suppress("DEPRECATION")
                event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
            }
            if (isForegroundEvent && event.timeStamp >= latestTime) {
                latestTime = event.timeStamp
                latestPkg = event.packageName
            }
        }
        return latestPkg
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "IntentGate アプリ制限監視",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "制限対象アプリの起動を検知して認知課題ゲートを表示します"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    @SuppressLint("NotificationTrampoline")
    private fun buildForegroundNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, flags)

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        return builder
            .setContentTitle("IntentGate 監視中")
            .setContentText("制限に設定したアプリを開く時に課題を表示します")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    /**
     * タスク一覧（三本線 / Recents）からスワイプキルされた場合に
     * クイズ未完了であれば自動的にMainActivityを再起動して引き戻す
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        if (MainActivity.isQuizInProgress && MainActivity.isGateEnabled(this)) {
            Log.i(TAG, "Task removed while quiz in progress – relaunching MainActivity")
            try {
                val relaunch = Intent(this, MainActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                    )
                }
                startActivity(relaunch)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to relaunch after task removed", e)
            }
        }
    }

    override fun onDestroy() {
        monitorHandler.removeCallbacks(monitorRunnable)
        if (isReceiverRegistered) {
            try {
                unregisterReceiver(unlockReceiver)
            } catch (e: Exception) {
                // ignore
            }
            isReceiverRegistered = false
        }
        super.onDestroy()
    }
}