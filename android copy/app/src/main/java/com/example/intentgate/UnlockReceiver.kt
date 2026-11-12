package com.example.intentgate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log

/**
 * IntentGate - ロック解除・画面点灯検知レシーバー
 */
class UnlockReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "IntentGateReceiver"
        private var lastLaunchTime = 0L
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Broadcast received: $action")

        if (action == Intent.ACTION_USER_PRESENT) {
            val now = System.currentTimeMillis()
            if (now - lastLaunchTime < 1500) {
                return
            }
            lastLaunchTime = now

            // アプリ起動がオフに設定されている場合は何もしない
            if (!MainActivity.isGateEnabled(context)) {
                Log.i(TAG, "Gate is disabled by user setting. Skip launching MainActivity.")
                return
            }

            // Android 10以降のバックグラウンド起動制限（重ねて表示権限）チェック
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                Log.w(TAG, "SYSTEM_ALERT_WINDOW permission not granted. Cannot launch activity from background.")
                return
            }

            try {
                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    putExtra("FROM_UNLOCK", true)
                }
                context.startActivity(launchIntent)
                Log.i(TAG, "MainActivity launched successfully on lock/wake event")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch MainActivity", e)
            }
        }
    }
}