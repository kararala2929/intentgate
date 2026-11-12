# IntentGate

スマホのロック解除時に「利用目的の確認（6択）」と「8ジャンルの認知課題（3段階難易度）」を表示し、1週間の起動履歴・目的別統計グラフを記録するAndroid向け認知フリクションアプリです。

ヘッダーにある「日」「英」ボタンをタップすることで、アプリ全体の表示言語（日本語 / 英語）をワンタップで切り替えることができます。また、Androidネイティブアプリ（Kotlin / Foreground Service / targetSdk 34）およびPWA（Progressive Web App）の両方に対応しています。

---

## ファイル構成

```text
.
├── index.html                  # エントリーポイント（PWAメタタグ・マニフェスト連携）
├── package.json                # 依存ライブラリと起動スクリプトの定義
├── start-win.bat               # Windows用ワンクリック起動スクリプト
├── start-mac.command           # Mac用ワンクリック起動スクリプト
├── android/                    # Android Studioネイティブプロジェクト（targetSdk 34）
│   ├── app/
│   │   ├── build.gradle.kts    # アプリビルド定義（署名済みAPK生成対応）
│   │   └── src/main/
│   │       ├── AndroidManifest.xml # 権限・常駐サービス・レシーバー定義
│   │       └── java/com/example/intentgate/
│   │           ├── MainActivity.kt  # WebView連携・AndroidBridgeインターフェース
│   │           ├── UnlockService.kt # ロック解除監視フォアグラウンドサービス
│   │           ├── UnlockReceiver.kt# 画面点灯・解除検知レシーバー
│   │           └── BootReceiver.kt  # 端末再起動時の自動復帰レシーバー
├── public/
│   ├── manifest.json           # Androidインストール用PWAマニフェスト
│   └── icon.svg                # アプリアイコン画像
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx                 # アプリ本体（日/英切替・自動解除・ペナルティ・統計管理・ネイティブ同期）
    ├── types/
    │   └── index.ts            # 言語・問題・統計の型定義
    ├── i18n/
    │   └── translations.ts     # 日英UI多言語辞書（目的・難易度・カテゴリ・各画面テキスト）
    ├── config/
    │   └── constants.ts        # 目的・カテゴリ・カラー・ストレージキー定数
    ├── data/
    │   ├── generators.ts       # 計算・瞬間記憶・色文字・時計図形・論理パズルの自動生成関数
    │   ├── vocabBank.ts        # 英単語 厳選50問データバンク
    │   ├── kanjiBank.ts        # 漢字・四字熟語・故事成語 厳選50問データバンク
    │   ├── triviaBank.ts       # 地理・歴史 厳選50問データバンク
    │   ├── challenges.ts       # ハズレ選択肢の動的シャッフル＆直近正解フィルタ統合エンジン
    │   └── statsStorage.ts     # 過去7日間の起動回数・目的別集計ストレージ管理
    └── components/
        ├── PurposeStep.tsx     # Step 1: 6択目的ボタン（日英対応・タップで即問題へ）
        ├── ChallengeStep.tsx   # Step 2: 8ジャンル問題画面（日英対応・正解時は自動で解除へ）
        ├── UnlockedStep.tsx    # Step 3: 解錠完了＆統計ボタン表示画面（日英対応）
        ├── StatsModal.tsx      # 1週間の日別棒グラフ＆目的別内訳グラフ画面（日英対応）
        └── SettingsModal.tsx   # 難易度・出題ジャンルON/OFF・常駐ON/OFF設定画面（日英対応）
```

---

## AI Studioの変更をローカル（VS Code）およびGitHubへ反映する手順（Windows）

AI Studioで不要コードを削除・最適化した最新状態を、Windowsパソコン上のVS Codeプロジェクトへ上書きし、GitHubへ送信する手順です。

### 1. AI StudioからZIPファイルをダウンロード
- AI Studio画面の右上にあるダウンロードアイコン（または「Code / Export」メニュー）をクリックして、プロジェクトをZIPファイルとしてダウンロードします。

### 2. ZIPファイルをすべて展開
- ダウンロードフォルダにあるZIPファイルを右クリックし、「**すべて展開...**」を選択して解凍します。

### 3. VS Codeのプロジェクトフォルダへ上書きコピー
- 解凍したフォルダを開き、中のファイル・フォルダをすべて選択（`Ctrl + A`）してコピー（`Ctrl + C`）します。
- 現在VS Codeで開いているローカルの作業フォルダを開き、貼り付け（`Ctrl + V`）します。
- 「**ファイルを置き換える**」ダイアログが表示されたら、「**宛先のファイルを置き換える**」を選択してください。
  > **注意**: ローカルフォルダ内にある隠しフォルダ `.git` は上書きされずに保持されるため、Gitのコミット履歴やGitHubとの接続設定が壊れることはありません。

### 4. VS Codeで変更差分を確認
- VS Codeを開き、画面左端の「**ソース管理（Gitアイコン）**」をクリックします。
- 変更一覧（変更 / Changes）に以下が表示されていることを確認します：
  - `D`（削除 / Deleted）: `src/components/MobileGuideModal.tsx`
  - `M`（変更 / Modified）: `src/components/SettingsModal.tsx`, `src/config/constants.ts`, `src/i18n/translations.ts`, `README.md`

### 5. コミットしてGitHubへプッシュ
- 「メッセージ」入力欄にコミットメッセージを入力します（例: `refactor: 不要コンポーネントおよび未使用コードの整理`）。
- 「**コミット**」ボタンをクリックします。
- コミット後、表示される「**変更の同期（Sync Changes）**」ボタンをクリックすると、GitHub（リポジトリのmainブランチ）へ変更が反映されます。

---

## ローカル環境での起動手順

- **Windows**: `start-win.bat` をダブルクリック
- **Mac**: `start-mac.command` をダブルクリック
- **コマンドライン**: ターミナルで `npm install && npm run dev` を実行し、ブラウザで `http://localhost:3000` を開きます。
