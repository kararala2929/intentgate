/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Settings } from 'lucide-react';
import { ChallengeStep } from './components/ChallengeStep';
import { PurposeStep } from './components/PurposeStep';
import { SettingsModal } from './components/SettingsModal';
import { StatsModal } from './components/StatsModal';
import { UnlockedStep } from './components/UnlockedStep';
import {
  ALL_CATEGORIES,
  DEFAULT_APP_SETTINGS,
  STORAGE_KEY_LANGUAGE,
  STORAGE_KEY_SETTINGS,
} from './config/constants';
import { markChallengeSolved, pickNextChallenge } from './data/challenges';
import {
  clearAllUnlockLogs,
  loadUnlockLogs,
  recordUnlockLog,
  toDateKey,
} from './data/statsStorage';
import { TRANSLATIONS } from './i18n/translations';
import { AppSettings, ChallengeItem, GateStep, Language, PurposeId, UnlockLogItem } from './types';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
      if (saved === 'en' || saved === 'ja') return saved;
      return 'ja';
    } catch {
      return 'ja';
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (!saved) return DEFAULT_APP_SETTINGS;
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
        enabledCategories:
          Array.isArray(parsed.enabledCategories) && parsed.enabledCategories.length > 0
            ? parsed.enabledCategories
            : ALL_CATEGORIES,
      };
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });

  const [unlockLogs, setUnlockLogs] = useState<UnlockLogItem[]>(() => loadUnlockLogs());
  const [step, setStep] = useState<GateStep>('purpose_check');
  const [selectedPurposeId, setSelectedPurposeId] = useState<PurposeId>('contact');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  // Challenge state
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeItem>(() =>
    pickNextChallenge(settings.enabledCategories, settings.difficulty)
  );
  const [streak, setStreak] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [penaltySeconds, setPenaltySeconds] = useState<number>(0);

  // Persist language
  const handleLanguageChange = (nextLang: Language) => {
    setLanguage(nextLang);
    try {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, nextLang);
    } catch {
      // ignore
    }
  };

  // Persist settings & sync to native AndroidBridge
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }

    // Android Native側のオン/オフ設定を同期
    try {
      const bridge = (window as any).AndroidBridge ?? (window as any).Android;
      if (bridge?.setGateEnabled) {
        bridge.setGateEnabled(settings.isGateEnabled);
      }
    } catch (e) {
      console.warn('[IntentGate] sync setGateEnabled failed:', e);
    }
  }, [settings]);

  // 初回ロード時にネイティブ側の状態を反映（ネイティブアプリ内で動いている場合）
  useEffect(() => {
    try {
      const bridge = (window as any).AndroidBridge ?? (window as any).Android;
      if (bridge?.isGateEnabled) {
        const nativeEnabled = bridge.isGateEnabled();
        if (typeof nativeEnabled === 'boolean') {
          setSettings((prev) => ({ ...prev, isGateEnabled: nativeEnabled }));
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Regenerate problem when settings change
  useEffect(() => {
    setCurrentChallenge(pickNextChallenge(settings.enabledCategories, settings.difficulty));
    setStreak(0);
    setSelectedOption(null);
    setFeedbackState('idle');
    setPenaltySeconds(0);
  }, [settings.enabledCategories, settings.difficulty]);

  const advanceToNextWrongProblem = useCallback(() => {
    setSelectedOption(null);
    setFeedbackState('idle');
    setPenaltySeconds(0);
    setCurrentChallenge((prev) =>
      pickNextChallenge(settings.enabledCategories, settings.difficulty, prev.id)
    );
  }, [settings.enabledCategories, settings.difficulty]);

  // 正解した時は 0.7秒後に自動で解除画面（または次の問題）へ移る
  useEffect(() => {
    if (feedbackState !== 'correct') return;
    const timer = window.setTimeout(() => {
      const nextStreak = streak + 1;
      if (nextStreak >= settings.requiredStreak) {
        const updated = recordUnlockLog(selectedPurposeId, settings.difficulty);
        setUnlockLogs(updated);
        setStep('unlocked');

        // ── Androidアプリに「閉じて」と通知 ──
        try {
          const bridge = (window as any).AndroidBridge ?? (window as any).Android;
          if (bridge?.unlockAndDismiss) {
            bridge.unlockAndDismiss();
          }
        } catch (e) {
          console.warn('[IntentGate] AndroidBridge call failed:', e);
        }

        return;
      }
      setStreak(nextStreak);
      setSelectedOption(null);
      setFeedbackState('idle');
      setPenaltySeconds(0);
      setCurrentChallenge((prev) =>
        pickNextChallenge(settings.enabledCategories, settings.difficulty, prev.id)
      );
    }, 700);
    return () => clearTimeout(timer);
  }, [
    feedbackState,
    streak,
    settings.requiredStreak,
    settings.enabledCategories,
    settings.difficulty,
    selectedPurposeId,
  ]);

  // 間違えた時の5秒間ペナルティカウントダウン → 0秒になったら自動的に次の問題へ切り替える
  useEffect(() => {
    if (feedbackState !== 'wrong') return;
    if (penaltySeconds <= 0) {
      advanceToNextWrongProblem();
      return;
    }
    const timer = window.setTimeout(() => {
      setPenaltySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [feedbackState, penaltySeconds, advanceToNextWrongProblem]);

  // スマホで画面を閉じて（スリープ・別アプリ切替して）再び開いた瞬間に自動で最初に戻す
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setStep('purpose_check');
        setStreak(0);
        setSelectedOption(null);
        setFeedbackState('idle');
        setPenaltySeconds(0);
        setCurrentChallenge(
          pickNextChallenge(settings.enabledCategories, settings.difficulty)
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.enabledCategories, settings.difficulty]);

  const t = TRANSLATIONS[language];
  const selectedPurposeLabel =
    t.purposes[selectedPurposeId]?.label || t.purposes.contact.label;

  const todayKey = toDateKey(new Date());
  const todayCount = unlockLogs.filter((l) => l.dateKey === todayKey).length;

  const handleResetToStart = () => {
    setStep('purpose_check');
    setStreak(0);
    setSelectedOption(null);
    setFeedbackState('idle');
    setPenaltySeconds(0);
    setCurrentChallenge(pickNextChallenge(settings.enabledCategories, settings.difficulty));
  };

  // 6つの目的ボタンを押した瞬間に次の問題画面へ進む
  const handleSelectPurposeAndProceed = (purposeId: string) => {
    setSelectedPurposeId(purposeId as PurposeId);
    setStreak(0);
    setSelectedOption(null);
    setFeedbackState('idle');
    setPenaltySeconds(0);
    setCurrentChallenge(pickNextChallenge(settings.enabledCategories, settings.difficulty));
    setStep('challenge_gate');
  };

  const handleSelectChoiceAnswer = (index: number) => {
    if (feedbackState !== 'idle') return;
    setSelectedOption(index);
    if (index === currentChallenge.correctIndex) {
      markChallengeSolved(currentChallenge.id);
      setFeedbackState('correct');
    } else {
      setFeedbackState('wrong');
      setPenaltySeconds(5);
    }
  };

  const handleSubmitNumpadAnswer = (typedValue: string) => {
    if (feedbackState !== 'idle') return;
    if (typedValue.trim() === currentChallenge.correctAnswerText) {
      markChallengeSolved(currentChallenge.id);
      setFeedbackState('correct');
    } else {
      setFeedbackState('wrong');
      setPenaltySeconds(5);
    }
  };

  const handleClearStats = () => {
    setUnlockLogs(clearAllUnlockLogs());
  };

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-slate-900 flex flex-col justify-between max-w-md mx-auto select-none border-x border-slate-200/70">
      {/* スマホアプリ上部バー（言語切替ボタン、統計ボタン、設定ボタン） */}
      <header className="px-4 pt-3.5 pb-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
        <span className="text-sm font-bold tracking-tight text-slate-900 shrink-0">
          IntentGate
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* 日 / 英 言語切り替えトグルボタン */}
          <div
            className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80"
            role="group"
            aria-label="Language Switcher"
          >
            <button
              type="button"
              onClick={() => handleLanguageChange('ja')}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                language === 'ja'
                  ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="日本語に切り替え"
            >
              日
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                language === 'en'
                  ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Switch to English"
            >
              英
            </button>
          </div>

          {/* 統計ボタン */}
          <button
            type="button"
            onClick={() => setIsStatsOpen(true)}
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.header.stats}</span>
          </button>

          {/* 難易度・設定ボタン */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors"
          >
            <span>{t.difficulties[settings.difficulty]}</span>
            <Settings className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </header>

      {/* Step 1: 6つの目的をタップしたら即座に問題へ */}
      {step === 'purpose_check' && (
        <PurposeStep
          language={language}
          onSelectPurposeAndProceed={handleSelectPurposeAndProceed}
        />
      )}

      {/* Step 2: 全8ジャンルの問題画面（正解時は0.7秒後に自動で解除、不正解時は5秒後に自動で次へ） */}
      {step === 'challenge_gate' && (
        <ChallengeStep
          language={language}
          purposeLabel={selectedPurposeLabel}
          difficulty={settings.difficulty}
          challenge={currentChallenge}
          streak={streak}
          requiredStreak={settings.requiredStreak}
          selectedOption={selectedOption}
          feedbackState={feedbackState}
          penaltySeconds={penaltySeconds}
          onSelectChoiceAnswer={handleSelectChoiceAnswer}
          onSubmitNumpadAnswer={handleSubmitNumpadAnswer}
          onBackToPurpose={() => setStep('purpose_check')}
        />
      )}

      {/* Step 3: 解錠完了画面 */}
      {step === 'unlocked' && (
        <UnlockedStep
          language={language}
          purposeLabel={selectedPurposeLabel}
          todayCount={todayCount}
          onOpenStats={() => setIsStatsOpen(true)}
          onSimulateScreenOffAndWake={handleResetToStart}
        />
      )}

      {/* 1週間の起動統計グラフモーダル */}
      <StatsModal
        isOpen={isStatsOpen}
        language={language}
        logs={unlockLogs}
        onClearLogs={handleClearStats}
        onClose={() => setIsStatsOpen(false)}
      />

      {/* 難易度・問題設定モーダル */}
      <SettingsModal
        isOpen={isSettingsOpen}
        language={language}
        settings={settings}
        onUpdateSettings={setSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
