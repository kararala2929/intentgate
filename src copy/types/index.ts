/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'ja' | 'en';

export type ChallengeCategory =
  | 'math'     // 計算問題
  | 'vocab'    // 英単語
  | 'logic'    // 論理パズル
  | 'memory'   // 瞬間記憶（フラッシュメモリー）
  | 'stroop'   // ストループテスト（色と文字のひっかけ）
  | 'kanji'    // 漢字・四字熟語・ことわざ
  | 'trivia'   // 地理・歴史クイズ
  | 'spatial'; // ミラー時計・角度・図形パズル

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export type PurposeId = 'study' | 'contact' | 'search' | 'sns' | 'kill_time' | 'other';

export type GateStep =
  | 'purpose_check'   // Step 1: 6択をタップしたら即座に問題へ
  | 'challenge_gate'  // Step 2: 8ジャンルの問題出題
  | 'unlocked';       // Step 3: 解錠完了（ホームから開いた時も統計へアクセス可能）

export interface PurposeOption {
  id: PurposeId;
  label: string;
  subLabel: string;
  barColor: string;
}

export interface ChallengeItem {
  id: string;
  category: ChallengeCategory;
  difficulty: DifficultyLevel;
  inputMode: 'choice' | 'numpad';
  question: string;
  subPrompt?: string;
  /** 瞬間記憶（memory）用：最初の数秒だけ表示して消える文字列 */
  flashText?: string;
  /** フラッシュ表示するミリ秒数 */
  flashDurationMs?: number;
  /** ストループテスト（stroop）用：色付きで大きく表示する文字 */
  stroopDisplay?: {
    word: string;
    colorHex: string;
  };
  options: string[];
  correctIndex: number;
  correctAnswerText: string;
  explanation: string;
}

export interface AppSettings {
  isGateEnabled: boolean; // ロック解除時の自動起動オン/オフ
  enabledCategories: ChallengeCategory[];
  difficulty: DifficultyLevel;
  requiredStreak: number; // 解錠に必要な正解数（1〜3問）
}

export interface UnlockLogItem {
  id: string;
  dateKey: string;      // YYYY-MM-DD
  timestamp: string;    // HH:MM
  purposeId: PurposeId;
  difficulty: DifficultyLevel;
}

export interface DailyStatDay {
  dateKey: string;      // YYYY-MM-DD
  shortDate: string;    // M/D
  dayOfWeek: string;    // 月, 火, 水...
  isToday: boolean;
  totalCount: number;
  byPurpose: Record<PurposeId, number>;
}
