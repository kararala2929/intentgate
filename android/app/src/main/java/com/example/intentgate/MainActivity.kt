package com.example.intentgate

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
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

    companion object {
        private const val REQUEST_CODE_OVERLAY = 2001
        const val APP_URL = "https://ais-dev-jzzwy2zb75ntoxkxzifqf7-569377906061.asia-east1.run.app"
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
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                    return false
                }
            }

            // Web画面から「解錠完了！」の合図を受け取ってアプリを即座に終了する窓口
            addJavascriptInterface(AndroidBridge(), "AndroidBridge")
            addJavascriptInterface(AndroidBridge(), "Android")
        }

        setContentView(webView)

        // 5. 最新の「戻る操作（ジェスチャー / 戻るボタン）」ハンドラを登録
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (::webView.isInitialized && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // WebアプリのURLを読み込み
        webView.loadUrl(APP_URL)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)

        if (::webView.isInitialized) {
            webView.evaluateJavascript(
                "try { window.dispatchEvent(new Event('visibilitychange')); } catch(e) {}",
                null
            )
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
                        val intent = Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:$packageName")
                        )
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                Toast.makeText(this, "権限が許可されました。ロック解除時の自動起動が有効です。", Toast.LENGTH_SHORT).show()
                UnlockService.start(this)
            } else {
                Toast.makeText(this, "権限が許可されていないため、ロック解除時の自動割り込みができません。", Toast.LENGTH_LONG).show()
            }
        }
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun unlockAndDismiss() {
            runOnUiThread {
                finishAndRemoveTask()
                @Suppress("DEPRECATION")
                overridePendingTransition(0, 0)
            }
        }

        @JavascriptInterface
        fun closeApp() {
            runOnUiThread {
                finishAndRemoveTask()
                @Suppress("DEPRECATION")
                overridePendingTransition(0, 0)
            }
        }

        @JavascriptInterface
        fun finish() {
            runOnUiThread {
                finishAndRemoveTask()
                @Suppress("DEPRECATION")
                overridePendingTransition(0, 0)
            }
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean {
            return true
        }

        @JavascriptInterface
        fun onUnlockSuccess(purpose: String?, count: Int) {
            // Android側ログ用
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}