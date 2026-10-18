/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TRANSLATIONS } from '../i18n/translations';
import { AppSettings, ChallengeCategory, DifficultyLevel, Language, PurposeId, PurposeOption } from '../types';

export const STORAGE_KEY_SETTINGS = 'intentgate_settings_v2';
export const STORAGE_KEY_UNLOCK_LOGS = 'intentgate_unlock_logs_v1';
export const STORAGE_KEY_LANGUAGE = 'intentgate_language_v1';

/**
 * 全8ジャンルの名称定義（日本語デフォルト）
 */
export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  math: '計算問題',
  vocab: '英単語',
  logic: '論理パズル',
  memory: '瞬間記憶',
  stroop: '色・文字判定',
  kanji: '漢字・熟語',
  trivia: '地理・歴史',
  spatial: '時計・図形',
};

export const ALL_CATEGORIES: ChallengeCategory[] = [
  'math',
  'vocab',
  'logic',
  'memory',
  'stroop',
  'kanji',
  'trivia',
  'spatial',
];

/**
 * アプリの初期設定値（全8ジャンル有効）
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  isGateEnabled: true,
  enabledCategories: ALL_CATEGORIES,
  difficulty: 'normal',
  requiredStreak: 1,
};

/**
 * 難易度ラベル定義（日本語デフォルト）
 */
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'かんたん',
  normal: '中級',
  hard: '上級',
};

/**
 * 目的ごとのテーマカラー定義
 */
export const PURPOSE_COLORS: Record<PurposeId, string> = {
  study: '#10B981',
  contact: '#3B82F6',
  search: '#06B6D4',
  sns: '#F59E0B',
  kill_time: '#F43F5E',
  other: '#8B5CF6',
};

export const PURPOSE_IDS: PurposeId[] = [
  'study',
  'contact',
  'search',
  'sns',
  'kill_time',
  'other',
];

/**
 * 指定した言語に応じた目的リストを取得
 */
export function getPurposeOptions(lang: Language): PurposeOption[] {
  const t = TRANSLATIONS[lang].purposes;
  return PURPOSE_IDS.map((id) => ({
    id,
    label: t[id].label,
    subLabel: t[id].subLabel,
    barColor: PURPOSE_COLORS[id],
  }));
}

/**
 * 1タップで選べる6つの利用目的（互換用日本語リスト）
 */
export const PURPOSE_OPTIONS: PurposeOption[] = getPurposeOptions('ja');
