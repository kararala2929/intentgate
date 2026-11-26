package com.example.intentgate

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.AppOpsManager
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.provider.Settings
import android.util.Base64
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

/**
 * IntentGate - メイン画面（特定アプリ起動時割り込み＆クリア後自動復帰対応）
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var pendingTargetPackage: String? = null
    private var pendingTargetAppName: String? = null

    /** クイズを正解・解錠完了したかどうかのフラグ（完了するまでアプリ終了・離脱を防止） */
    private var isQuizCompleted: Boolean = false

    /** onUserLeaveHint の連続発火を防ぐデバウンス用タイムスタンプ */
    private var lastLeaveHintTime: Long = 0L

    /** 権限設定画面へ遷移中は離脱防止を一時解除するフラグ */
    private var isNavigatingToSettings: Boolean = false

    /** UI スレッド用ハンドラ（遅延実行用） */
    private val handler = Handler(Looper.getMainLooper())

    companion object {
        private const val REQUEST_CODE_OVERLAY = 2001
        const val APP_URL = "https://intentgate-ten.vercel.app/"
        const val PREFS_NAME = "intentgate_prefs"
        const val PREF_KEY_ENABLED = "gate_enabled"
        const val PREF_KEY_RESTRICTED_PACKAGES = "restricted_packages"

        const val EXTRA_TARGET_PACKAGE = "TARGET_PACKAGE"
        const val EXTRA_TARGET_APP_NAME = "TARGET_APP_NAME"

        /** onUserLeaveHint のデバウンス間隔（ミリ秒） */
        private const val LEAVE_HINT_DEBOUNCE_MS = 600L

        private val DEFAULT_RESTRICTED = setOf(
            "com.google.android.youtube",
            "com.twitter.android",
            "com.instagram.android",
            "com.zhiliaoapp.musically"
        )

        /** クイズが進行中（未解錠）かどうかを示すグローバルフラグ（UnlockService から参照） */
        @Volatile
        var isQuizInProgress: Boolean = false

        /** クイズクリア済みのアプリをセッション中再割り込みしないための追跡変数 */
        @Volatile
        var unlockedSessionPackage: String? = null

        @Volatile
        var lastSeenUnlockedAppAt: Long = 0L

        fun markAppUnlockedForSession(packageName: String) {
            unlockedSessionPackage = packageName
            lastSeenUnlockedAppAt = System.currentTimeMillis()
        }

        fun clearUnlockedSession() {
            unlockedSessionPackage = null
            lastSeenUnlockedAppAt = 0L
        }

        fun isGateEnabled(context: Context): Boolean {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(PREF_KEY_ENABLED, true)
        }

        fun setGateEnabled(context: Context, enabled: Boolean) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(PREF_KEY_ENABLED, enabled)
                .apply()
        }

        fun getRestrictedPackages(context: Context): Set<String> {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            if (!prefs.contains(PREF_KEY_RESTRICTED_PACKAGES)) {
                return DEFAULT_RESTRICTED
            }
            return prefs.getStringSet(PREF_KEY_RESTRICTED_PACKAGES, emptySet()) ?: emptySet()
        }

        fun setRestrictedPackages(context: Context, packages: Set<String>) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putStringSet(PREF_KEY_RESTRICTED_PACKAGES, packages)
                .apply()
        }

        fun hasUsageStatsPermission(context: Context): Boolean {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
                ?: return false
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName
                )
            }
            return mode == AppOpsManager.MODE_ALLOWED
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 割り込み起動時はクイズ進行中フラグを立てる
        isQuizInProgress = true
        isQuizCompleted = false
        isNavigatingToSettings = false

        extractTargetFromIntent(intent)
        setupLockscreenDisplay()
        checkOverlayPermission()
        UnlockService.start(this)

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

            addJavascriptInterface(AndroidBridge(), "AndroidBridge")
            addJavascriptInterface(AndroidBridge(), "Android")
        }

        setContentView(webView)

        // ナビゲーションバー（四角ボタン等）を隠す没入モード
        hideSystemUI()

        // 戻る操作ハンドラ（解錠完了まで脱出をブロック）
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (isQuizCompleted) {
                    if (::webView.isInitialized && webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        moveTaskToBack(true)
                    }
                } else {
                    Toast.makeText(this@MainActivity, "クイズに正解するまで戻れません 🔒", Toast.LENGTH_SHORT).show()
                }
            }
        })

        webView.loadUrl(APP_URL)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        extractTargetFromIntent(intent)

        // 割り込み再開時にフラグをリセット
        isQuizCompleted = false
        isQuizInProgress = true
        isNavigatingToSettings = false

        if (::webView.isInitialized) {
            webView.evaluateJavascript(
                "try { window.dispatchEvent(new Event('intentgate:interrupt')); } catch(e) {}",
                null
            )
        }
    }

    // ─────────────────────────────────────────────────────
    // 離脱防止：ホームボタン・四角ボタン（タスク一覧）押下時
    // ─────────────────────────────────────────────────────

    /**
     * ホームボタンや四角ボタンが押された時に呼ばれる。
     * クイズ未完了かつ設定画面遷移中でなければ即座にアプリを最前面へ引き戻す。
     */
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (isQuizCompleted || isNavigatingToSettings) return

        val now = System.currentTimeMillis()
        if (now - lastLeaveHintTime < LEAVE_HINT_DEBOUNCE_MS) return
        lastLeaveHintTime = now

        handler.postDelayed({
            if (!isQuizCompleted && !isNavigatingToSettings && !isFinishing) {
                bringToFront()
            }
        }, 150)
    }

    /**
     * アプリが非表示になった時に呼ばれる。
     * クイズ未完了かつ設定画面遷移中でなければアプリを最前面へ引き戻す。
     */
    override fun onStop() {
        super.onStop()
        if (isQuizCompleted || isNavigatingToSettings || isFinishing) return

        handler.postDelayed({
            if (!isQuizCompleted && !isNavigatingToSettings && !isFinishing) {
                bringToFront()
            }
        }, 300)
    }

    /**
     * ウィンドウフォーカスが戻った時に没入モードを再適用
     */
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && !isQuizCompleted) {
            hideSystemUI()
        }
    }

    /**
     * アプリを最前面に引き戻すヘルパー
     */
    private fun bringToFront() {
        try {
            val relaunch = Intent(this, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                )
            }
            startActivity(relaunch)
        } catch (e: Exception) {
            android.util.Log.w("IntentGate", "bringToFront failed", e)
        }
    }

    // ─────────────────────────────────────────────────────
    // 没入モード（ナビゲーションバー・ステータスバー非表示）
    // ─────────────────────────────────────────────────────

    private fun hideSystemUI() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.let { controller ->
                    controller.hide(
                        android.view.WindowInsets.Type.navigationBars() or
                            android.view.WindowInsets.Type.statusBars()
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

    // ─────────────────────────────────────────────────────
    // Intent / ロック画面 / オーバーレイ権限
    // ─────────────────────────────────────────────────────

    private fun extractTargetFromIntent(intent: Intent?) {
        val pkg = intent?.getStringExtra(EXTRA_TARGET_PACKAGE)
        if (!pkg.isNullOrBlank()) {
            pendingTargetPackage = pkg
            pendingTargetAppName = intent.getStringExtra(EXTRA_TARGET_APP_NAME) ?: resolveAppLabel(pkg)
        }
    }

    private fun resolveAppLabel(packageName: String): String {
        return try {
            val info = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(info).toString()
        } catch (e: Exception) {
            packageName
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
                    .setMessage("制限したアプリを起動した際にIntentGateを自動で前面表示するため、「他のアプリの上に重ねて表示」を許可してください。")
                    .setPositiveButton("設定画面を開く") { _, _ ->
                        // 設定画面への遷移中は離脱防止を一時解除
                        isQuizCompleted = true
                        isQuizInProgress = false
                        isNavigatingToSettings = true
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
            isQuizInProgress = true
            isNavigatingToSettings = false
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                Toast.makeText(this, "重ねて表示の権限が許可されました。", Toast.LENGTH_SHORT).show()
                UnlockService.start(this)
            } else {
                Toast.makeText(this, "権限が未許可のため、自動割り込みが動作しません。", Toast.LENGTH_LONG).show()
            }
        }
    }

    // ─────────────────────────────────────────────────────
    // ユーティリティ
    // ─────────────────────────────────────────────────────

    private fun drawableToBase64(drawable: Drawable): String {
        return try {
            val size = 64
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            if (drawable is BitmapDrawable && drawable.bitmap != null) {
                val scaled = Bitmap.createScaledBitmap(drawable.bitmap, size, size, true)
                canvas.drawBitmap(scaled, 0f, 0f, null)
            } else {
                drawable.setBounds(0, 0, size, size)
                drawable.draw(canvas)
            }
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, stream)
            val encoded = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
            "data:image/png;base64,$encoded"
        } catch (e: Exception) {
            ""
        }
    }

    // ─────────────────────────────────────────────────────
    // AndroidBridge（Web ↔ Native 連携）
    // ─────────────────────────────────────────────────────

    inner class AndroidBridge {

        private fun dismissApp() {
            android.util.Log.i("IntentGate", "AndroidBridge: dismissApp called")
            isQuizCompleted = true
            isQuizInProgress = false
            moveTaskToBack(true)
            finishAndRemoveTask()
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        }

        private fun launchOriginalApp(targetPkg: String) {
            android.util.Log.i("IntentGate", "Unlock complete. Returning to: $targetPkg")
            isQuizCompleted = true
            isQuizInProgress = false
            markAppUnlockedForSession(targetPkg)
            pendingTargetPackage = null
            pendingTargetAppName = null

            val launchIntent = packageManager.getLaunchIntentForPackage(targetPkg)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            }
            if (launchIntent != null) {
                startActivity(launchIntent)
            }
            finishAndRemoveTask()
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun isGateEnabled(): Boolean = isGateEnabled(this@MainActivity)

        @JavascriptInterface
        fun setGateEnabled(enabled: Boolean) {
            setGateEnabled(this@MainActivity, enabled)
        }

        @JavascriptInterface
        fun hasUsageStatsPermission(): Boolean = hasUsageStatsPermission(this@MainActivity)

        @JavascriptInterface
        fun openUsageStatsSettings() {
            runOnUiThread {
                try {
                    isNavigatingToSettings = true
                    isQuizCompleted = true
                    isQuizInProgress = false
                    startActivity(
                        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                    )
                } catch (e: Exception) {
                    isNavigatingToSettings = false
                    isQuizCompleted = false
                    isQuizInProgress = true
                    Toast.makeText(this@MainActivity, "設定画面を開けませんでした", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun hasOverlayPermission(): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(this@MainActivity)
            } else {
                true
            }
        }

        @JavascriptInterface
        fun openOverlaySettings() {
            runOnUiThread {
                isNavigatingToSettings = true
                isQuizCompleted = true
                isQuizInProgress = false
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    startActivity(
                        Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:$packageName")
                        ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
                    )
                }
            }
        }

        @JavascriptInterface
        fun getInstalledApps(): String {
            return try {
                val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }
                val resolveInfos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    packageManager.queryIntentActivities(
                        mainIntent,
                        PackageManager.ResolveInfoFlags.of(0L)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    packageManager.queryIntentActivities(mainIntent, 0)
                }

                val seenPackages = HashSet<String>()
                val jsonArray = JSONArray()
                resolveInfos
                    .sortedBy { it.loadLabel(packageManager).toString().lowercase() }
                    .forEach { info ->
                        val pkg = info.activityInfo?.packageName ?: return@forEach
                        if (pkg == packageName || !seenPackages.add(pkg)) return@forEach
                        val label = info.loadLabel(packageManager).toString()
                        val iconBase64 = drawableToBase64(info.loadIcon(packageManager))
                        val obj = JSONObject().apply {
                            put("packageName", pkg)
                            put("appName", label)
                            if (iconBase64.isNotEmpty()) {
                                put("iconBase64", iconBase64)
                            }
                        }
                        jsonArray.put(obj)
                    }
                jsonArray.toString()
            } catch (e: Exception) {
                "[]"
            }
        }

        @JavascriptInterface
        fun getRestrictedPackages(): String {
            val list = getRestrictedPackages(this@MainActivity)
            return JSONArray(list.toList()).toString()
        }

        @JavascriptInterface
        fun setRestrictedPackages(packagesJson: String) {
            try {
                val arr = JSONArray(packagesJson)
                val nextSet = HashSet<String>()
                for (i in 0 until arr.length()) {
                    val pkg = arr.optString(i)
                    if (pkg.isNotBlank()) nextSet.add(pkg)
                }
                setRestrictedPackages(this@MainActivity, nextSet)
            } catch (e: Exception) {
                android.util.Log.e("IntentGate", "Failed to save restricted packages", e)
            }
        }

        @JavascriptInterface
        fun getPendingTargetApp(): String {
            val pkg = pendingTargetPackage ?: return ""
            val name = pendingTargetAppName ?: resolveAppLabel(pkg)
            return JSONObject().apply {
                put("packageName", pkg)
                put("appName", name)
            }.toString()
        }

        @JavascriptInterface
        fun clearPendingTargetApp() {
            pendingTargetPackage = null
            pendingTargetAppName = null
        }

        @JavascriptInterface
        fun unlockAndReturnToApp(packageName: String) {
            runOnUiThread {
                if (packageName.isNotBlank()) {
                    launchOriginalApp(packageName)
                } else {
                    dismissApp()
                }
            }
        }

        @JavascriptInterface
        fun unlockAndDismiss() {
            runOnUiThread {
                val pending = pendingTargetPackage
                if (!pending.isNullOrBlank()) {
                    launchOriginalApp(pending)
                } else {
                    dismissApp()
                }
            }
        }

        @JavascriptInterface
        fun onUnlockSuccess(purpose: String?, count: Int) {
            unlockAndDismiss()
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
