package com.example.intentgate

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class LockActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 画面を最前面に表示するフラグ
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()

            // ステップ1で作ったWeb側の合図を受け取るブリッジ
            addJavascriptInterface(object {
                @JavascriptInterface
                fun unlockAndDismiss() {
                    runOnUiThread {
                        // 解錠完了！画面を閉じて元のスマホ画面に戻す
                        moveTaskToBack(true)
                        finish()
                    }
                }
            }, "AndroidBridge")

            // あなたがデプロイしたVercelのURLを読み込む
            loadUrl("https://intentgate-ten.vercel.app")
        }

        setContentView(webView)
    }

    // クイズを解く前に戻るボタンで逃げられないようにする
    override fun onBackPressed() {
        // 何もしない（課題クリアを促す）
    }
}