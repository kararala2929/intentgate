/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChallengeCategory, ChallengeItem, DifficultyLevel } from '../types';
import {
  generateLogicChallenge,
  generateMathChallenge,
  generateMemoryChallenge,
  generateSpatialChallenge,
  generateStroopChallenge,
  shuffleArray,
} from './generators';
import { KANJI_BANK_50 } from './kanjiBank';
import { TRIVIA_BANK_50 } from './triviaBank';
import { KnowledgeSeedItem, VOCAB_BANK_50 } from './vocabBank';

const RECENT_SOLVED_STORAGE_KEY = 'intentgate_recent_solved_v1';
const MAX_RECENT_HISTORY = 15;

/**
 * 最近正解した問題のID履歴を取得する（しばらく出にくくする軽量フィルタ用）
 */
function getRecentlySolvedIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SOLVED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 正解した知識問題のIDを履歴に記録する（最新15件まで保持）
 */
export function markChallengeSolved(challengeId: string): void {
  // 自動生成問題（math-, memory-, stroop-, spatial-, logic-）は毎回問題が変わるため対象外
  if (
    challengeId.startsWith('math-') ||
    challengeId.startsWith('memory-') ||
    challengeId.startsWith('stroop-') ||
    challengeId.startsWith('spatial-') ||
    challengeId.startsWith('logic-')
  ) {
    return;
  }
  try {
    const current = getRecentlySolvedIds().filter((id) => id !== challengeId);
    const updated = [challengeId, ...current].slice(0, MAX_RECENT_HISTORY);
    localStorage.setItem(RECENT_SOLVED_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

/**
 * 50問の知識バンクから1問を選び、他の問題の答えからハズレ選択肢3個をランダム抽出＆順番シャッフルして出題データを組み立てる
 */
function buildDynamicKnowledgeChallenge(
  category: 'vocab' | 'kanji' | 'trivia',
  bank: KnowledgeSeedItem[],
  difficulty: DifficultyLevel,
  excludeId?: string
): ChallengeItem {
  const recentIds = new Set(getRecentlySolvedIds());

  // 1. 指定難易度の問題リストを取得
  const byDifficulty = bank.filter(
    (item) => item.difficulty === difficulty && item.id !== excludeId
  );

  // 2. 最近正解していない問題を優先（もし全て最近正解済みなら全体から選ぶ）
  const freshCandidates = byDifficulty.filter((item) => !recentIds.has(item.id));
  const poolToPickFrom =
    freshCandidates.length > 0
      ? freshCandidates
      : byDifficulty.length > 0
      ? byDifficulty
      : bank;

  const target = poolToPickFrom[Math.floor(Math.random() * poolToPickFrom.length)];

  // 3. 同じ poolGroup（品詞・問題タイプ）かつ同じ難易度を優先してハズレ選択肢（3個）をランダム抽出
  const sameGroupSameDiff = bank.filter(
    (item) =>
      item.id !== target.id &&
      item.poolGroup === target.poolGroup &&
      item.difficulty === difficulty &&
      item.answer !== target.answer
  );

  const sameGroupAllDiff = bank.filter(
    (item) =>
      item.id !== target.id &&
      item.poolGroup === target.poolGroup &&
      item.answer !== target.answer
  );

  const distractorSource =
    sameGroupSameDiff.length >= 3 ? sameGroupSameDiff : sameGroupAllDiff;

  const shuffledDistractors = shuffleArray(distractorSource);
  const pickedDistractors: string[] = [];
  for (const item of shuffledDistractors) {
    if (!pickedDistractors.includes(item.answer)) {
      pickedDistractors.push(item.answer);
    }
    if (pickedDistractors.length >= 3) break;
  }

  // 4. 正解とハズレ3個を合わせて毎回順番をシャッフル
  const options = shuffleArray([target.answer, ...pickedDistractors]);
  const correctIndex = options.indexOf(target.answer);

  return {
    id: target.id,
    category,
    difficulty: target.difficulty,
    inputMode: 'choice',
    question: target.question,
    subPrompt: target.subPrompt,
    options,
    correctIndex,
    correctAnswerText: target.answer,
    explanation: target.explanation,
  };
}

/**
 * 全8ジャンルの中からランダムに次の1問を取り出すメイン関数
 */
export function pickNextChallenge(
  enabledCategories: ChallengeCategory[],
  difficulty: DifficultyLevel,
  excludeId?: string
): ChallengeItem {
  const categories: ChallengeCategory[] =
    enabledCategories.length > 0
      ? enabledCategories
      : ['math', 'vocab', 'logic', 'memory', 'stroop', 'kanji', 'trivia', 'spatial'];

  const chosenCategory = categories[Math.floor(Math.random() * categories.length)];

  switch (chosenCategory) {
    // --- プログラム関数で毎回自動生成する5ジャンル ---
    case 'math':
      return generateMathChallenge(difficulty);
    case 'memory':
      return generateMemoryChallenge(difficulty);
    case 'stroop':
      return generateStroopChallenge(difficulty);
    case 'spatial':
      return generateSpatialChallenge(difficulty);
    case 'logic':
      return generateLogicChallenge(difficulty);

    // --- 各50問バンク＋ハズレ選択肢＆順番を毎回動的シャッフルする知識系3ジャンル ---
    case 'vocab':
      return buildDynamicKnowledgeChallenge('vocab', VOCAB_BANK_50, difficulty, excludeId);
    case 'kanji':
      return buildDynamicKnowledgeChallenge('kanji', KANJI_BANK_50, difficulty, excludeId);
    case 'trivia':
      return buildDynamicKnowledgeChallenge('trivia', TRIVIA_BANK_50, difficulty, excludeId);
    default:
      return generateMathChallenge(difficulty);
  }
}
