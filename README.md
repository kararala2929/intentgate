# IntentGate

スマホのロック解除時に「利用目的の確認（6択）」と「8ジャンルの認知課題（3段階難易度）」を表示し、1週間の起動履歴・目的別統計グラフを記録するAndroid向けアプリです。
ヘッダーにある「日」「英」ボタンをタップすることで、アプリ全体の表示言語（日本語 / 英語）をワンタップで切り替えることができます。また、PWA（Progressive Web App）に対応しており、Androidスマートフォンのホーム画面に追加してネイティブアプリのように全画面で起動できます。

## ファイル構成

```text
.
├── index.html                  # エントリーポイント（PWAメタタグ・マニフェスト連携）
├── package.json                # 依存ライブラリと起動スクリプトの定義
├── start-win.bat               # Windows用ワンクリック起動スクリプト
├── start-mac.command           # Mac用ワンクリック起動スクリプト
├── public/
│   ├── manifest.json           # Androidインストール用PWAマニフェスト
│   └── icon.svg                # アプリアイコン画像
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx                 # アプリ本体（日/英切替・自動解除・ペナルティ・統計管理）
    ├── types/
    │   └── index.ts            # 言語・問題・統計の型定義
    ├── i18n/
    │   └── translations.ts     # 日英UI多言語辞書（目的・難易度・カテゴリ・各画面テキスト）
    ├── config/
    │   └── constants.ts        # 目的・カテゴリ・カラー・ストレージキー定数
    ├── data/
    │   ├── generators.ts       # 計算・瞬間記憶・色文字・時計図形・論理パズルの自動生成関数
    │   ├── vocabBank.ts        # 英単語 厳選50問データバンク（※原文維持）
    │   ├── kanjiBank.ts        # 漢字・四字熟語・故事成語 厳選50問データバンク（※原文維持）
    │   ├── triviaBank.ts       # 地理・歴史 厳選50問データバンク（※原文維持）
    │   ├── challenges.ts       # ハズレ選択肢の動的シャッフル＆直近正解フィルタ統合エンジン
    │   └── statsStorage.ts     # 過去7日間（1週間分）の起動回数・目的別集計ストレージ管理
    └── components/
        ├── PurposeStep.tsx     # Step 1: 6択目的ボタン（日英対応・タップで即問題へ）
        ├── ChallengeStep.tsx   # Step 2: 8ジャンル問題画面（日英対応・正解時は自動で解除へ）
        ├── UnlockedStep.tsx    # Step 3: 解錠完了＆統計ボタン表示画面（日英対応）
        ├── StatsModal.tsx      # 1週間の日別棒グラフ＆目的別内訳グラフ画面（日英対応）
        ├── SettingsModal.tsx   # 難易度・出題ジャンルON/OFF設定画面（日英対応）
        └── MobileGuideModal.tsx # スマホ連携用QRコード・ホーム画面追加ガイドモーダル
```

## Androidスマホでの使い方（PWAホーム画面追加）

1. アプリ上部ヘッダーの「スマホ」ボタンをタップすると、スマホのカメラで読み取れるQRコードが表示されます。
2. AndroidスマホのChromeでページを開きます。
3. Chrome右上の「︙（メニュー）」から「ホーム画面に追加」または「アプリをインストール」をタップします。
4. ホーム画面に専用アイコンが配置され、ブラウザ枠のない全画面アプリとして起動します。

## ローカル環境での起動手順

- **Windows**: `start-win.bat` をダブルクリック
- **Mac**: `start-mac.command` をダブルクリック
- **コマンドライン**: ターミナルで `npm install && npm run dev` を実行し、ブラウザで `http://localhost:3000` を開きます。
