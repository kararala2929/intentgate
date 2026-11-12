/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { STORAGE_KEY_UNLOCK_LOGS } from '../config/constants';
import { DailyStatDay, DifficultyLevel, PurposeId, UnlockLogItem } from '../types';

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * Date オブジェクトからローカル日付キー (YYYY-MM-DD) を生成
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 過去7日間の対象日付リスト（6日前〜今日）を生成
 */
export function getLast7DaysDates(): Date[] {
  const result: Date[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    result.push(d);
  }
  return result;
}

/**
 * 初回起動時に棒グラフの動きがすぐ確認できるよう、過去6日間のサンプル履歴を生成
 */
function createInitialSeedLogs(): UnlockLogItem[] {
  const dates = getLast7DaysDates();
  const seed: UnlockLogItem[] = [];
  const sampleCounts = [14, 11, 15, 9, 12, 8, 2]; // 徐々にスマホ回数が減っているリアルな推移
  const purposes: PurposeId[] = ['contact', 'sns', 'search', 'study', 'kill_time', 'other'];

  dates.forEach((d, dayIdx) => {
    const dKey = toDateKey(d);
    const count = sampleCounts[dayIdx] ?? 5;
    for (let c = 0; c < count; c++) {
      const pId = purposes[(dayIdx + c * 2) % purposes.length];
      const hour = String(8 + ((c * 2) % 14)).padStart(2, '0');
      const min = String((c * 13) % 60).padStart(2, '0');
      seed.push({
        id: `seed-${dKey}-${c}`,
        dateKey: dKey,
        timestamp: `${hour}:${min}`,
        purposeId: pId,
        difficulty: 'normal',
      });
    }
  });
  return seed;
}

/**
 * 保存されている過去7日分の解錠履歴を取得
 */
export function loadUnlockLogs(): UnlockLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNLOCK_LOGS);
    if (!raw) {
      const initial = createInitialSeedLogs();
      localStorage.setItem(STORAGE_KEY_UNLOCK_LOGS, JSON.stringify(initial));
      return initial;
    }
    const parsed: UnlockLogItem[] = JSON.parse(raw);
    const validKeys = new Set(getLast7DaysDates().map(toDateKey));
    return parsed.filter((item) => validKeys.has(item.dateKey));
  } catch {
    return [];
  }
}

/**
 * 新しい解錠ログを1件追加して保存（7日より古いデータは自動整理）
 */
export function recordUnlockLog(
  purposeId: PurposeId,
  difficulty: DifficultyLevel
): UnlockLogItem[] {
  const now = new Date();
  const dateKey = toDateKey(now);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  const newEntry: UnlockLogItem = {
    id: `unlock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateKey,
    timestamp: `${hh}:${mm}`,
    purposeId,
    difficulty,
  };

  const current = loadUnlockLogs();
  const validKeys = new Set(getLast7DaysDates().map(toDateKey));
  const updated = [newEntry, ...current].filter((item) => validKeys.has(item.dateKey));

  try {
    localStorage.setItem(STORAGE_KEY_UNLOCK_LOGS, JSON.stringify(updated));
  } catch {
    // ignore storage error
  }
  return updated;
}

/**
 * 統計データを0件にリセット
 */
export function clearAllUnlockLogs(): UnlockLogItem[] {
  try {
    localStorage.setItem(STORAGE_KEY_UNLOCK_LOGS, JSON.stringify([]));
  } catch {
    // ignore
  }
  return [];
}

/**
 * ログ配列から過去7日間の日別集計データを作成
 */
export function buildWeeklyDailyStats(logs: UnlockLogItem[]): DailyStatDay[] {
  const dates = getLast7DaysDates();
  const todayKey = toDateKey(new Date());

  return dates.map((d) => {
    const dKey = toDateKey(d);
    const dayLogs = logs.filter((l) => l.dateKey === dKey);
    const byPurpose: Record<PurposeId, number> = {
      study: 0,
      contact: 0,
      search: 0,
      sns: 0,
      kill_time: 0,
      other: 0,
    };

    dayLogs.forEach((item) => {
      byPurpose[item.purposeId] = (byPurpose[item.purposeId] || 0) + 1;
    });

    return {
      dateKey: dKey,
      shortDate: `${d.getMonth() + 1}/${d.getDate()}`,
      dayOfWeek: DAY_NAMES[d.getDay()],
      isToday: dKey === todayKey,
      totalCount: dayLogs.length,
      byPurpose,
    };
  });
}
