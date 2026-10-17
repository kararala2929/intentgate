/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Delete, Eye, XCircle } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { ChallengeItem, DifficultyLevel, Language } from '../types';

interface ChallengeStepProps {
  language: Language;
  purposeLabel: string;
  difficulty: DifficultyLevel;
  challenge: ChallengeItem;
  streak: number;
  requiredStreak: number;
  selectedOption: number | null;
  feedbackState: 'idle' | 'correct' | 'wrong';
  penaltySeconds: number;
  onSelectChoiceAnswer: (index: number) => void;
  onSubmitNumpadAnswer: (value: string) => void;
  onBackToPurpose: () => void;
}

export const ChallengeStep: React.FC<ChallengeStepProps> = ({
  language,
  purposeLabel,
  difficulty,
  challenge,
  streak,
  requiredStreak,
  selectedOption,
  feedbackState,
  penaltySeconds,
  onSelectChoiceAnswer,
  onSubmitNumpadAnswer,
  onBackToPurpose,
}) => {
  const [typedValue, setTypedValue] = useState<string>('');
  const [isFlashingMemory, setIsFlashingMemory] = useState<boolean>(false);

  const t = TRANSLATIONS[language];
  const tChallenge = t.challengeStep;
  const categoryLabel = t.categories[challenge.category];
  const difficultyLabel = t.difficulties[difficulty];

  // 問題が切り替わったらテンキー入力値と瞬間記憶フラッシュ状態を初期化
  useEffect(() => {
    setTypedValue('');
    if (challenge.flashText) {
      setIsFlashingMemory(true);
      const timer = window.setTimeout(() => {
        setIsFlashingMemory(false);
      }, challenge.flashDurationMs || 2200);
      return () => clearTimeout(timer);
    } else {
      setIsFlashingMemory(false);
    }
  }, [challenge.id, challenge.flashText, challenge.flashDurationMs]);

  const handleDigitPress = (digit: string) => {
    if (feedbackState !== 'idle' || isFlashingMemory) return;
    if (typedValue.length >= 7) return;
    setTypedValue((prev) => prev + digit);
  };

  const handleBackspace = () => {
    if (feedbackState !== 'idle' || isFlashingMemory) return;
    setTypedValue((prev) => prev.slice(0, -1));
  };

  const handleConfirmNumpad = () => {
    if (feedbackState !== 'idle' || isFlashingMemory || typedValue.length === 0) return;
    onSubmitNumpadAnswer(typedValue);
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-5">
      <div>
        {/* 上部ステータス */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <button
            type="button"
            onClick={onBackToPurpose}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 py-1 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>
              {tChallenge.purposePrefix}
              {purposeLabel}
            </span>
          </button>
          <span className="font-mono-tabular text-emerald-700 font-semibold">
            {categoryLabel} · {difficultyLabel}（{streak}/{requiredStreak}）
          </span>
        </div>

        {/* 複数問設定時の進捗バー */}
        {requiredStreak > 1 && (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {Array.from({ length: requiredStreak }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-colors ${
                  idx < streak
                    ? 'bg-emerald-500'
                    : idx === streak
                    ? 'bg-amber-500'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* 問題カード（白基調） */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs mb-4">
          {challenge.subPrompt && (
            <p className="text-xs text-slate-500 mb-1.5">{challenge.subPrompt}</p>
          )}

          {/* 瞬間記憶（フラッシュメモリー）表示中 */}
          {challenge.flashText && isFlashingMemory ? (
            <div className="py-5 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-2">
                <Eye className="w-4 h-4" />
                <span>{tChallenge.memorizePrompt}</span>
              </div>
              <div className="text-4xl font-bold tracking-[0.25em] text-slate-900 font-mono-tabular">
                {challenge.flashText}
              </div>
            </div>
          ) : (
            <>
              <div className="text-lg font-bold text-slate-900 leading-relaxed font-mono-tabular">
                {challenge.question}
              </div>

              {/* ストループテスト用の色付き文字表示 */}
              {challenge.stroopDisplay && (
                <div className="mt-3 py-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <span
                    className="text-4xl font-extrabold tracking-wider"
                    style={{ color: challenge.stroopDisplay.colorHex }}
                  >
                    {challenge.stroopDisplay.word}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* 瞬間記憶フラッシュ終了後に解答欄を表示 */}
        {!isFlashingMemory && (
          <>
            {/* パターンA: 4択タップ形式 */}
            {challenge.inputMode === 'choice' && (
              <div className="space-y-2.5 mb-4">
                {challenge.options.map((optionText, idx) => {
                  const isPicked = selectedOption === idx;
                  const isCorrect = idx === challenge.correctIndex;

                  let buttonStyle =
                    'bg-white border-slate-200 text-slate-800 hover:border-emerald-500 hover:bg-emerald-50/30 shadow-2xs';
                  if (feedbackState !== 'idle') {
                    if (isCorrect) {
                      buttonStyle =
                        'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                    } else if (isPicked && !isCorrect) {
                      buttonStyle = 'bg-rose-50 border-rose-500 text-rose-900 font-medium';
                    } else {
                      buttonStyle = 'bg-slate-50 border-slate-200/60 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={feedbackState !== 'idle'}
                      onClick={() => onSelectChoiceAnswer(idx)}
                      className={`w-full min-h-[52px] px-4 py-3 rounded-2xl border text-left text-base flex items-center justify-between transition-colors ${buttonStyle}`}
                    >
                      <span className="pr-2 font-mono-tabular">{optionText}</span>
                      {feedbackState !== 'idle' && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {feedbackState !== 'idle' && isPicked && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* パターンB: 数字テンキー手入力形式 */}
            {challenge.inputMode === 'numpad' && (
              <div className="mb-4">
                <div
                  className={`min-h-[52px] px-4 py-2.5 rounded-2xl border mb-3 flex items-center justify-between font-mono-tabular text-2xl font-bold ${
                    feedbackState === 'correct'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : feedbackState === 'wrong'
                      ? 'bg-rose-50 border-rose-500 text-rose-800'
                      : 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                  }`}
                >
                  <span
                    className={
                      typedValue ? 'text-slate-900' : 'text-slate-400 text-base font-normal'
                    }
                  >
                    {typedValue || tChallenge.enterAnswerPlaceholder}
                  </span>
                  {feedbackState === 'idle' && typedValue.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="p-1.5 text-slate-400 hover:text-slate-800"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {feedbackState === 'idle' && (
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleDigitPress(digit)}
                        className="min-h-[48px] rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs text-lg font-mono-tabular font-bold text-slate-900 active:scale-[0.97]"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTypedValue('')}
                      className="min-h-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-600"
                    >
                      {tChallenge.numpadClear}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDigitPress('0')}
                      className="min-h-[48px] rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs text-lg font-mono-tabular font-bold text-slate-900 active:scale-[0.97]"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      disabled={typedValue.length === 0}
                      onClick={handleConfirmNumpad}
                      className={`min-h-[48px] rounded-xl text-sm font-bold transition-colors ${
                        typedValue.length > 0
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      {tChallenge.numpadConfirm}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 正誤フィードバック（正解時は自動で解除/次へ移行、不正解時は5秒後に自動で次へ移行） */}
        {feedbackState !== 'idle' && (
          <div
            className={`p-4 rounded-2xl border text-xs leading-relaxed ${
              feedbackState === 'correct'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="font-bold mb-1 flex items-center justify-between">
              <span className={feedbackState === 'correct' ? 'text-emerald-800' : 'text-rose-800'}>
                {feedbackState === 'correct'
                  ? streak + 1 >= requiredStreak
                    ? tChallenge.correctUnlocking
                    : tChallenge.correctNext
                  : tChallenge.wrongPenalty}
              </span>
              {feedbackState === 'wrong' && (
                <span className="font-mono-tabular text-rose-700 font-bold shrink-0 ml-2">
                  {tChallenge.penaltyRemaining.replace('{sec}', String(penaltySeconds))}
                </span>
              )}
            </div>
            {challenge.explanation && (
              <p className="text-slate-700">{challenge.explanation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
