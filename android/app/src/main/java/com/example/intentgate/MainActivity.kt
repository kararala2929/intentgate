package com.example.intentgate

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * IntentGate - メイン画面（どんな環境でもエラーゼロで動作する標準設計）
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // レイアウトXML不要で、直接画面を生成
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

            // ★超重要：Web画面から「解錠完了！」の合図を受け取ってアプリを自動終了する窓口
            addJavascriptInterface(AndroidBridge(), "AndroidBridge")
            addJavascriptInterface(AndroidBridge(), "Android")
        }

        setContentView(webView)

        // WebアプリのURLを読み込み
        webView.loadUrl("https://intentgate-ten.vercel.app/")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    /**
     * Web画面（JavaScript）から呼び出される連携クラス
     */
    inner class AndroidBridge {
        /**
         * 問題を正解して解錠した瞬間にWebから自動で呼ばれ、アプリを閉じます
         */
        @JavascriptInterface
        fun unlockAndDismiss() {
            runOnUiThread {
                finishAndRemoveTask() // アプリを閉じて直前の画面に戻る
            }
        }

        @JavascriptInterface
        fun closeApp() {
            runOnUiThread {
                finishAndRemoveTask()
            }
        }

        @JavascriptInterface
        fun finish() {
            runOnUiThread {
                finishAndRemoveTask()
            }
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