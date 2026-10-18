package com.example.intentgate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * IntentGate - 端末再起動時・アプリアップデート時の自動復旧レシーバー
 *
 * スマホ本体を再起動した直後にも自動で UnlockService を立ち上げ、
 * ロック解除検知が途切れないようにします。
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "IntentGateBoot"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Boot/Package action received: $action")

        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            try {
                UnlockService.start(context)
                Log.i(TAG, "UnlockService successfully restarted after boot/package update")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start UnlockService on boot", e)
            }
        }
    }
}
