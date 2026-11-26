package com.example.intentgate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * IntentGate - 画面消灯時にセッション許可状態をリセットするレシーバー
 */
class UnlockReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "IntentGateReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Broadcast received: $action")

        if (action == Intent.ACTION_SCREEN_OFF) {
            // 画面を閉じたタイミングで、解錠済みセッションをリセットする
            MainActivity.clearUnlockedSession()
            Log.i(TAG, "Cleared unlocked app session on screen off")
        }
    }
}