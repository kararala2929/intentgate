# IntentGate 開発引き継ぎメモ

更新日: 2026-11-26

---

## 1. 現在の実装状況

### ✅ 完了した機能
- [x] プロジェクトフォルダ内の不要なコピーファイル（`* copy*`）の整理・削除
- [x] Web側（React）に「制限対象アプリの選択・設定画面」の設計・実装
- [x] クイズ正解後に目的アプリを起動するロジック（元アプリ自動復帰）の実装
- [x] Android側の監視ロジック（特定アプリ起動検知 `UsageStatsManager`）のアップデート
- [x] 離脱防止の復元（没入モード・onUserLeaveHint・onStop引き戻し・onTaskRemoved自動復帰）
- [x] APKビルド・GitHub push・Vercel自動デプロイ確認済み

### ❌ 見送った機能
- iOSショートカット連携用の案内ガイド・導線の追加（時間不足のため見送り）

---

## 2. 開発フロー

### ハイブリッド開発フロー
* **Google AI Studio（無料・制限が緩い）**:
  * 新機能のアイデア相談、Reactコードの作成、画面設計などの「思考・大量生成」を担当。
* **Antigravity（端末操作・自動化特化）**:
  * AI Studioで作ったコードのファイル反映、リリース用APKのビルド、GitHubへのプッシュなどの「仕上げ・実機検証」を担当。

---

## 3. デプロイ・更新方法

### Web側（React / クイズ画面やデザイン）
* `src/` を変更して GitHub にプッシュすると、Vercel が自動デプロイ → スマホ側も即反映。
* URL: https://intentgate-ten.vercel.app/

### Android側（Kotlin / 監視サービスや権限）
* APKの再ビルド＆スマホへの上書きインストールが必要。
* 直ダウンロードリンク: https://github.com/kararala2929/intentgate/raw/main/IntentGate.apk

---

## 4. Androidの脱出防止テクニック（実装済み）

1. **ナビゲーションバー非表示（没入モード / Immersive Sticky Mode）**
2. **戻るボタン・戻るジェスチャーの無効化**（`onBackPressedDispatcher`）
3. **ホームボタン・四角ボタン押下時の即時引き戻し**（`onUserLeaveHint` / `onStop`）
4. **タスク一覧に非表示**（`android:excludeFromRecents="true"`）
5. **タスクキル時の自動復帰**（`UnlockService.onTaskRemoved`）

---

## 5. 次回やることチェックリスト
- [ ] テスターからのフィードバック収集と改善
- [ ] 15分間パス機能の検討・実装
- [ ] アプリアイコンのカスタムデザイン
- [ ] Google Play ストアへの公開準備（署名鍵・ストア説明文・スクリーンショット）
