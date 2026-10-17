/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChallengeCategory, DifficultyLevel, Language, PurposeId } from '../types';

export const STORAGE_KEY_LANGUAGE = 'intentgate_language_v1';

export interface PurposeTranslation {
  label: string;
  subLabel: string;
}

export const TRANSLATIONS = {
  ja: {
    langLabel: {
      ja: '日',
      en: '英',
    },
    header: {
      title: 'IntentGate',
      stats: '統計',
    },
    difficulties: {
      easy: 'かんたん',
      normal: '中級',
      hard: '上級',
    } as Record<DifficultyLevel, string>,
    categories: {
      math: '計算問題',
      vocab: '英単語',
      logic: '論理パズル',
      memory: '瞬間記憶',
      stroop: '色・文字判定',
      kanji: '漢字・熟語',
      trivia: '地理・歴史',
      spatial: '時計・図形',
    } as Record<ChallengeCategory, string>,
    purposes: {
      study: { label: '勉強', subLabel: '学習・暗記・講義' },
      contact: { label: '連絡', subLabel: 'LINE・メール・通話' },
      search: { label: '調べ物', subLabel: '検索・地図・乗換' },
      sns: { label: 'SNS', subLabel: 'X・インスタ・動画' },
      kill_time: { label: '暇つぶし', subLabel: 'なんとなく・休憩' },
      other: { label: 'その他', subLabel: 'メモ・決済・カメラ' },
    } as Record<PurposeId, PurposeTranslation>,
    purposeStep: {
      stepTag: 'Step 1 / 2',
      title: '何のために開きましたか？',
      subtitle: '目的をタップすると、すぐに問題画面へ進みます',
    },
    challengeStep: {
      purposePrefix: '目的：',
      memorizePrompt: '今のうちに記憶してください！',
      enterAnswerPlaceholder: '答えを入力...',
      numpadClear: 'クリア',
      numpadConfirm: '決定',
      correctUnlocking: '正解！自動でロックを解除します...',
      correctNext: '正解！自動で次の問題へ移ります...',
      wrongPenalty: '不正解！5秒後に自動で次の問題へ切り替わります',
      penaltyRemaining: 'あと {sec}秒',
    },
    unlockedStep: {
      tag: 'ロック解除完了',
      purposePrefix: '目的：',
      todayCount: '今日のスマホ起動回数：{count}回',
      openStatsButton: '1週間の統計グラフを見る',
      simulateLockButton: '画面を閉じて、もう一度開く',
    },
    statsModal: {
      title: '1週間のスマホ起動統計',
      todayCount: '今日の起動',
      weekTotal: '7日間合計',
      dailyAvg: '1日平均',
      unitTimes: '回',
      dailyChartTitle: '日別の起動回数（棒をタップで日別内訳）',
      resetToWeek: '7日間全体に戻す',
      todayText: '今日',
      breakdownDay: '{date}（{day}）の目的別内訳',
      breakdownWeek: '過去7日間の目的別内訳',
      totalCountText: '計 {count}回',
      countAndPercent: '{count}回（{percent}%）',
      clearHistory: '履歴リセット',
      clearConfirm: 'すべての起動履歴を消去してもよろしいですか？',
      close: '閉じる',
      days: ['日', '月', '火', '水', '木', '金', '土'],
    },
    settingsModal: {
      title: '難易度・出題設定',
      difficultySection: '問題の難易度（3段階）',
      categorySection: '出題ジャンル（全8ジャンルからランダム出題）',
      streakSection: '解錠に必要な正解数',
      streakCountLabel: '{count}問',
      close: '完了',
    },
  },
  en: {
    langLabel: {
      ja: 'JP',
      en: 'EN',
    },
    header: {
      title: 'IntentGate',
      stats: 'Stats',
    },
    difficulties: {
      easy: 'Easy',
      normal: 'Normal',
      hard: 'Hard',
    } as Record<DifficultyLevel, string>,
    categories: {
      math: 'Math',
      vocab: 'Vocab',
      logic: 'Logic',
      memory: 'Flash Memory',
      stroop: 'Stroop Test',
      kanji: 'Kanji & Idioms',
      trivia: 'Trivia & History',
      spatial: 'Spatial & Clock',
    } as Record<ChallengeCategory, string>,
    purposes: {
      study: { label: 'Study', subLabel: 'Courses, reading, study' },
      contact: { label: 'Contact', subLabel: 'Messages, mail, calls' },
      search: { label: 'Search', subLabel: 'Web search, maps, transit' },
      sns: { label: 'Social', subLabel: 'Feeds, reels, videos' },
      kill_time: { label: 'Kill Time', subLabel: 'Casual browsing, break' },
      other: { label: 'Other', subLabel: 'Notes, payments, camera' },
    } as Record<PurposeId, PurposeTranslation>,
    purposeStep: {
      stepTag: 'Step 1 / 2',
      title: 'Why did you open your phone?',
      subtitle: 'Tap your purpose to immediately start the challenge',
    },
    challengeStep: {
      purposePrefix: 'Purpose: ',
      memorizePrompt: 'Memorize this now!',
      enterAnswerPlaceholder: 'Enter answer...',
      numpadClear: 'Clear',
      numpadConfirm: 'Submit',
      correctUnlocking: 'Correct! Unlocking device...',
      correctNext: 'Correct! Next challenge...',
      wrongPenalty: 'Incorrect! Next challenge in 5 seconds',
      penaltyRemaining: '{sec}s remaining',
    },
    unlockedStep: {
      tag: 'Device Unlocked',
      purposePrefix: 'Purpose: ',
      todayCount: 'Phone unlocks today: {count} times',
      openStatsButton: 'View 7-day stats graph',
      simulateLockButton: 'Simulate screen off & wake',
    },
    statsModal: {
      title: '7-Day Unlock Stats',
      todayCount: "Today's Unlocks",
      weekTotal: '7-Day Total',
      dailyAvg: 'Daily Average',
      unitTimes: 'times',
      dailyChartTitle: 'Daily unlock counts (tap bar for breakdown)',
      resetToWeek: 'Reset to all 7 days',
      todayText: 'Today',
      breakdownDay: 'Breakdown for {date} ({day})',
      breakdownWeek: '7-day purpose breakdown',
      totalCountText: 'Total: {count}',
      countAndPercent: '{count} ({percent}%)',
      clearHistory: 'Clear Data',
      clearConfirm: 'Are you sure you want to clear all unlock history?',
      close: 'Close',
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
    settingsModal: {
      title: 'Challenge Settings',
      difficultySection: 'Challenge Difficulty (3 Levels)',
      categorySection: 'Categories (Randomized across active)',
      streakSection: 'Correct answers needed to unlock',
      streakCountLabel: '{count} Q',
      close: 'Done',
    },
  },
};
