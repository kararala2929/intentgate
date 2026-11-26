# IntentGate（Android専用）

スマホにインストールされているアプリ一覧から「制限したいアプリ（YouTube、X、Instagram、LINE、TikTokなど）」をトグルでONにするだけで、そのアプリを開いた瞬間に自動割り込みを行い、クイズ正解後に自動で元のアプリへ復帰させるAndroid向け認知フリクションアプリです。

---

## 動作の仕組み（Android Kotlin + React ハイブリッド構成）

1. **アプリ選択画面（React UI + Android `PackageManager`）**
   - Android実機内のインストール済みアプリ一覧（アイコン・アプリ名・パッケージ名）を取得し、ON/OFFトグルで制限対象を指定します。
2. **自動割り込み（Kotlin `UnlockService` + `UsageStatsManager`）**
   - 制限ONにしたアプリが起動された瞬間をバックグラウンドで検知し、`MainActivity`（IntentGate）を最前面に割り込み起動します。
3. **目的確認＆認知課題（React UI）**
   - 「何のために開くか（6択）」と「8ジャンルの認知課題」をクリアします。
4. **自動復帰＆完全終了（Kotlin `unlockAndReturnToApp`）**
   - クイズクリア通知を `AndroidBridge` 経由で受け取ると、該当アプリを一時許可状態にして元のアプリを自動起動し、同時に `finishAndRemoveTask()` と `android:excludeFromRecents="true"` によりIntentGate自身の画面・タスクを完全に終了します。

---

## ファイル構成

```text
.
├── index.html                           # Webエントリーポイント
├── package.json                         # 依存ライブラリと起動スクリプトの定義
├── start-win.bat                        # Windows用ワンクリック起動スクリプト
├── start-mac.command                    # Mac用ワンクリック起動スクリプト
├── android/                             # Android Studioネイティブプロジェクト（targetSdk 34）
│   └── app/src/main/
│       ├── AndroidManifest.xml          # UsageStats / Overlay / <queries> / excludeFromRecents 設定
│       └── java/com/example/intentgate/
│           ├── MainActivity.kt          # WebView・AndroidBridge・実機アプリ一覧取得・元アプリ復帰＆終了
│           ├── UnlockService.kt         # UsageStatsManagerによる制限アプリ起動監視サービス
│           ├── UnlockReceiver.kt        # 画面消灯時のセッション許可リセットレシーバー
│           └── BootReceiver.kt          # 端末再起動時の監視サービス自動再開レシーバー
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx                          # 全体進行管理・AndroidBridge連携・テスト起動制御
    ├── types/
    │   └── index.ts                     # インストールアプリ情報・権限・問題・統計の型定義
    ├── i18n/
    │   └── translations.ts              # 日英UI多言語辞書
    ├── config/
    │   ├── constants.ts                 # 定数・デフォルト制限パッケージ・自動復帰秒数
    │   └── appCatalog.ts                # 主要パッケージ名＆ブラウザプレビュー用アプリカタログ
    ├── utils/
    │   └── androidBridge.ts             # AndroidBridge連携＆Webプレビュー用フォールバック処理
    ├── data/
    │   ├── generators.ts                # 計算・瞬間記憶・色文字・時計図形・論理パズルの自動生成
    │   ├── vocabBank.ts                 # 英単語 厳選50問データバンク
    │   ├── kanjiBank.ts                 # 漢字・四字熟語・故事成語 厳選50問データバンク
    │   ├── triviaBank.ts                # 地理・歴史 厳選50問データバンク
    │   ├── challenges.ts                # 選択肢シャッフル＆出題統合エンジン
    │   └── statsStorage.ts              # 過去7日間の解除回数・目的別・アプリ別統計管理
    └── components/
        ├── TargetAppIcon.tsx            # 実機Base64アイコン＆Web用SVGアイコン表示
        ├── RestrictedAppsModal.tsx      # 制限アプリ選択画面（検索・ON/OFFトグル・権限誘導）
        ├── PurposeStep.tsx              # Step 1: 起動アプリ表示＋6択目的選択＋制限アプリ管理導線
        ├── ChallengeStep.tsx            # Step 2: 8ジャンル問題画面（正解時は自動復帰へ）
        ├── UnlockedStep.tsx             # Step 3: 解錠完了＆自動復帰確認画面（プレビュー用）
        ├── StatsModal.tsx               # 1週間の日別棒グラフ＆目的別・アプリ別内訳モーダル
        └── SettingsModal.tsx            # 監視ON/OFF・難易度・出題ジャンル・問題数設定モーダル
```

---

## ローカル環境での起動手順

- **Windows**: `start-win.bat` をダブルクリック
- **Mac**: `start-mac.command` をダブルクリック
- **Android実機ビルド**: `android/` フォルダを Android Studio で開き、実機へインストール後、「使用状況へのアクセス」と「他のアプリの上に重ねて表示」を許可してください。
