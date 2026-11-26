/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TRANSLATIONS } from '../i18n/translations';
import { AppSettings, ChallengeCategory, Language, PurposeId, PurposeOption } from '../types';

export const STORAGE_KEY_SETTINGS = 'intentgate_settings_v2';
export const STORAGE_KEY_UNLOCK_LOGS = 'intentgate_unlock_logs_v1';
export const STORAGE_KEY_LANGUAGE = 'intentgate_language_v1';
export const STORAGE_KEY_RESTRICTED_PACKAGES = 'intentgate_restricted_packages_v1';

/** クイズクリア後、元のアプリへ自動復帰するまでの秒数 */
export const AUTO_RETURN_SECONDS = 2;

/** 初回デフォルトで制限対象にする代表パッケージ（ユーザーが一覧から自由にON/OFF可能） */
export const DEFAULT_RESTRICTED_PACKAGES: string[] = [
  'com.google.android.youtube',
  'com.twitter.android',
  'com.instagram.android',
  'com.zhiliaoapp.musically',
];

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
