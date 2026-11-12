package com.example.intentgate

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback

/**
 * IntentGate - メイン画面（Kotlin版：最新AndroidX対応）
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    /** クイズを正解・解錠完了したかどうかのフラグ（完了するまでアプリ終了・離脱を防止） */
    private var isQuizCompleted: Boolean = false

    /** onUserLeaveHint の連続発火を防ぐデバウンス用タイムスタンプ */
    private var lastLeaveHintTime: Long = 0L

    /** UI スレッド用ハンドラ（遅延実行用） */
    private val handler = Handler(Looper.getMainLooper())

    companion object {
        private const val REQUEST_CODE_OVERLAY = 2001
        const val APP_URL = "https://intentgate-ten.vercel.app/"
        const val PREFS_NAME = "intentgate_prefs"
        const val PREF_KEY_ENABLED = "gate_enabled"

        /** onUserLeaveHint のデバウンス間隔（ミリ秒） */
        private const val LEAVE_HINT_DEBOUNCE_MS = 1000L

        /** アプリが有効かどうかを SharedPreferences から取得（デフォルト: 有効） */
        fun isGateEnabled(context: Context): Boolean {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(PREF_KEY_ENABLED, true)
        }

        /** アプリの有効/無効を SharedPreferences に保存 */
        fun setGateEnabled(context: Context, enabled: Boolean) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(PREF_KEY_ENABLED, enabled)
                .apply()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. ロック画面・スリープ画面の上からでも画面を表示可能にする設定
        setupLockscreenDisplay()

        // 2. 他のアプリの上に重ねて表示する権限（SYSTEM_ALERT_WINDOW）の確認と要求
        checkOverlayPermission()

        // 3. ロック解除検知用の常駐サービスを開始
        UnlockService.start(this)

        // 4. WebView の生成と設定
        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                @Suppress("DEPRECATION")
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                    return false
                }

                override fun onReceivedError(
                    view: WebView?,
                    errorCode: Int,
                    description: String?,
                    failingUrl: String?
                ) {
                    super.onReceivedError(view, errorCode, description, failingUrl)
                    android.util.Log.e("IntentGate", "WebView error: $errorCode $description @ $failingUrl")
                }
            }

            // Web画面から「解錠完了！」の合図を受け取ってアプリを即座に終了する窓口
            addJavascriptInterface(AndroidBridge(), "AndroidBridge")
            addJavascriptInterface(AndroidBridge(), "Android")
        }

        setContentView(webView)

        // 5. ナビゲーションバー（四角ボタン等）を隠す没入モード（setContentView の後に実行）
        hideSystemUI()

        // 6. 「戻る操作（ジェスチャー / 戻るボタン）」ハンドラを登録（解錠完了まで脱出をブロック）
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (isQuizCompleted) {
                    if (::webView.isInitialized && webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        finish()
                    }
                } else {
                    // クイズ未完了時は戻る操作による終了を無効化
                    Toast.makeText(this@MainActivity, "問題を解くまで中断できません", Toast.LENGTH_SHORT).show()
                }
            }
        })

        // WebアプリのURLを読み込み
        webView.loadUrl(APP_URL)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)

        // 再度ロック解除等で呼び出された際はクイズ未完了状態に戻す
        isQuizCompleted = false

        if (::webView.isInitialized) {
            webView.evaluateJavascript(
                "try { window.dispatchEvent(new Event('visibilitychange')); } catch(e) {}",
                null
            )
        }
    }

    override fun onResume() {
        super.onResume()
        hideSystemUI()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }

    /**
     * ユーザーが四角ボタン（履歴/タスクボタン）やホームボタンを押して離脱しようとした時の検知。
     * クイズ未完了時は少し遅延を入れてから Activity を最前面に引き戻す。
     * デバウンスにより連続発火・無限ループを防止する。
     */
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (!isQuizCompleted) {
            val now = System.currentTimeMillis()
            if (now - lastLeaveHintTime < LEAVE_HINT_DEBOUNCE_MS) {
                return // デバウンス：短時間の連続発火を無視
            }
            lastLeaveHintTime = now

            // 少し遅延を入れてから引き戻す（即座に呼ぶとライフサイクル競合でクラッシュする場合がある）
            handler.postDelayed({
                try {
                    val bringToFrontIntent = Intent(this, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    startActivity(bringToFrontIntent)
                } catch (e: Exception) {
                    android.util.Log.e("IntentGate", "Failed to bring activity to front", e)
                }
            }, 300L)
        }
    }

    /**
     * 没入モード（Immersive Sticky Mode）を適用し、ナビゲーションバー（四角ボタン・ホームボタン等）や
     * ステータスバーを非表示にして誤操作・離脱を防ぐ。
     * try-catch で安全に囲み、万一失敗してもアプリ全体がクラッシュしないようにする。
     */
    private fun hideSystemUI() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                @Suppress("DEPRECATION")
                window.setDecorFitsSystemWindows(false)
                window.insetsController?.let { controller ->
                    controller.hide(
                        android.view.WindowInsets.Type.statusBars() or
                        android.view.WindowInsets.Type.navigationBars()
                    )
                    controller.systemBarsBehavior =
                        android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                    android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                )
            }
        } catch (e: Exception) {
            android.util.Log.e("IntentGate", "hideSystemUI failed", e)
        }
    }

    private fun setupLockscreenDisplay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            keyguardManager?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
    }

    private fun checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                AlertDialog.Builder(this)
                    .setTitle("権限の許可が必要です")
                    .setMessage("スマホのロックを解除した際に自動でIntentGateを画面前面に起動するため、「他のアプリの上に重ねて表示」を許可してください。")
                    .setPositiveButton("設定画面を開く") { _, _ ->
                        // 設定画面への遷移中は離脱防止を一時解除
                        isQuizCompleted = true
                        val intent = Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:$packageName")
                        )
                        @Suppress("DEPRECATION")
                        startActivityForResult(intent, REQUEST_CODE_OVERLAY)
                    }
                    .setNegativeButton("あとで", null)
                    .setCancelable(false)
                    .show()
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_OVERLAY) {
            // 設定画面から戻ってきたらクイズ未完了状態に戻す
            isQuizCompleted = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                Toast.makeText(this, "権限が許可されました。ロック解除時の自動起動が有効です。", Toast.LENGTH_SHORT).show()
                UnlockService.start(this)
            } else {
                Toast.makeText(this, "権限が許可されていないため、ロック解除時の自動割り込みができません。", Toast.LENGTH_LONG).show()
            }
        }
    }

    inner class AndroidBridge {

        private fun dismissApp() {
            android.util.Log.i("IntentGate", "AndroidBridge: dismissApp called")
            isQuizCompleted = true
            moveTaskToBack(true)
            finishAndRemoveTask()
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        }

        @JavascriptInterface
        fun unlockAndDismiss() {
            android.util.Log.i("IntentGate", "AndroidBridge.unlockAndDismiss() called")
            runOnUiThread { dismissApp() }
        }

        @JavascriptInterface
        fun closeApp() {
            android.util.Log.i("IntentGate", "AndroidBridge.closeApp() called")
            runOnUiThread { dismissApp() }
        }

        @JavascriptInterface
        fun finish() {
            android.util.Log.i("IntentGate", "AndroidBridge.finish() called")
            runOnUiThread { dismissApp() }
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean {
            return true
        }

        @JavascriptInterface
        fun isGateEnabled(): Boolean {
            return isGateEnabled(this@MainActivity)
        }

        @JavascriptInterface
        fun setGateEnabled(enabled: Boolean) {
            android.util.Log.i("IntentGate", "AndroidBridge.setGateEnabled: $enabled")
            setGateEnabled(this@MainActivity, enabled)
        }

        @JavascriptInterface
        fun onUnlockSuccess(purpose: String?, count: Int) {
            android.util.Log.i("IntentGate", "AndroidBridge.onUnlockSuccess() purpose=$purpose count=$count")
            runOnUiThread { dismissApp() }
        }
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}
