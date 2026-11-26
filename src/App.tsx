/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Settings, Shield } from 'lucide-react';
import { ChallengeStep } from './components/ChallengeStep';
import { PurposeStep } from './components/PurposeStep';
import { RestrictedAppsModal } from './components/RestrictedAppsModal';
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
import {
  ActiveTargetApp,
  AndroidPermissionStatus,
  AppSettings,
  ChallengeItem,
  GateStep,
  InstalledAppInfo,
  Language,
  PurposeId,
  UnlockLogItem,
} from './types';
import {
  clearPendingTargetApp,
  getAndroidPermissionStatus,
  isRunningInNativeAndroid,
  loadInstalledApps,
  loadRestrictedPackages,
  notifyUnlockComplete,
  readNativeGateEnabled,
  readPendingTargetApp,
  saveRestrictedPackages,
  syncNativeGateEnabled,
} from './utils/androidBridge';

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

  const [isNativeApp] = useState<boolean>(() => isRunningInNativeAndroid());
  const [installedApps, setInstalledApps] = useState<InstalledAppInfo[]>(() =>
    loadInstalledApps()
  );
  const [restrictedPackages, setRestrictedPackages] = useState<string[]>(() =>
    loadRestrictedPackages()
  );
  const [permissionStatus, setPermissionStatus] = useState<AndroidPermissionStatus>(() =>
    getAndroidPermissionStatus()
  );
  const [targetApp, setTargetApp] = useState<ActiveTargetApp | null>(() =>
    readPendingTargetApp()
  );

  const [unlockLogs, setUnlockLogs] = useState<UnlockLogItem[]>(() => loadUnlockLogs());
  const [step, setStep] = useState<GateStep>('purpose_check');
  const [selectedPurposeId, setSelectedPurposeId] = useState<PurposeId>('contact');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isRestrictedAppsOpen, setIsRestrictedAppsOpen] = useState<boolean>(false);

  // Challenge state
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeItem>(() =>
    pickNextChallenge(settings.enabledCategories, settings.difficulty)
  );
  const [streak, setStreak] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [penaltySeconds, setPenaltySeconds] = useState<number>(0);

  const hiddenAtRef = useRef<number | null>(null);

  const handleLanguageChange = (nextLang: Language) => {
    setLanguage(nextLang);
    try {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, nextLang);
    } catch {
      // ignore
    }
  };

  // 初回ロード時にAndroidネイティブ側の状態と権限・アプリ一覧・制限リストを同期
  useEffect(() => {
    const nativeEnabled = readNativeGateEnabled();
    if (nativeEnabled !== null) {
      setSettings((prev) => ({ ...prev, isGateEnabled: nativeEnabled }));
    }
    setInstalledApps(loadInstalledApps());
    setPermissionStatus(getAndroidPermissionStatus());
    saveRestrictedPackages(restrictedPackages);

    const pending = readPendingTargetApp();
    if (pending) {
      setTargetApp(pending);
      setStep('purpose_check');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Androidネイティブ側（MainActivity.onNewIntent）からの割り込み起動イベントを受信
  useEffect(() => {
    const handleNativeInterrupt = () => {
      const pending = readPendingTargetApp();
      if (pending) {
        setTargetApp(pending);
      }
      setStep('purpose_check');
      setStreak(0);
      setSelectedOption(null);
      setFeedbackState('idle');
      setPenaltySeconds(0);
      setCurrentChallenge(
        pickNextChallenge(settings.enabledCategories, settings.difficulty)
      );
      setPermissionStatus(getAndroidPermissionStatus());
    };

    window.addEventListener('intentgate:interrupt', handleNativeInterrupt);
    return () =>
      window.removeEventListener('intentgate:interrupt', handleNativeInterrupt);
  }, [settings.enabledCategories, settings.difficulty]);

  // 設定の永続化＆ネイティブ同期
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
    syncNativeGateEnabled(settings.isGateEnabled);
  }, [settings]);

  // 問題設定変更時に再生成
  useEffect(() => {
    setCurrentChallenge(pickNextChallenge(settings.enabledCategories, settings.difficulty));
    setStreak(0);
    setSelectedOption(null);
    setFeedbackState('idle');
    setPenaltySeconds(0);
  }, [settings.enabledCategories, settings.difficulty]);

  // 制限対象アプリのON/OFF切り替え
  const handleToggleRestrictedPackage = useCallback((packageName: string) => {
    setRestrictedPackages((prev) => {
      const exists = prev.includes(packageName);
      const next = exists
        ? prev.filter((pkg) => pkg !== packageName)
        : [...prev, packageName];
      saveRestrictedPackages(next);
      return next;
    });
  }, []);

  // ブラウザプレビュー時：指定アプリの起動割り込みをシミュレート
  const handleSimulateAppLaunch = useCallback(
    (app: InstalledAppInfo) => {
      setTargetApp({
        packageName: app.packageName,
        appName: app.appName,
        iconBase64: app.iconBase64,
      });
      setStep('purpose_check');
      setStreak(0);
      setSelectedOption(null);
      setFeedbackState('idle');
      setPenaltySeconds(0);
      setCurrentChallenge(
        pickNextChallenge(settings.enabledCategories, settings.difficulty)
      );
    },
    [settings.enabledCategories, settings.difficulty]
  );

  const handleClearTarget = useCallback(() => {
    clearPendingTargetApp();
    setTargetApp(null);
  }, []);

  const advanceToNextWrongProblem = useCallback(() => {
    setSelectedOption(null);
    setFeedbackState('idle');
    setPenaltySeconds(0);
    setCurrentChallenge((prev) =>
      pickNextChallenge(settings.enabledCategories, settings.difficulty, prev.id)
    );
  }, [settings.enabledCategories, settings.difficulty]);

  // 正解した時は 0.7秒後に自動で解除（Android実機では即座に元アプリへ復帰＆画面終了）
  useEffect(() => {
    if (feedbackState !== 'correct') return;
    const timer = window.setTimeout(() => {
      const nextStreak = streak + 1;
      if (nextStreak >= settings.requiredStreak) {
        const updated = recordUnlockLog(
          selectedPurposeId,
          settings.difficulty,
          targetApp?.appName || targetApp?.packageName
        );
        setUnlockLogs(updated);
        setStep('unlocked');

        if (isNativeApp) {
          notifyUnlockComplete(targetApp?.packageName);
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
    targetApp,
    isNativeApp,
  ]);

  // 間違えた時の2秒間ペナルティカウントダウン → 0秒になったら自動的に次の問題へ
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

  // 別アプリや画面オフから復帰した際に権限状態・起動対象アプリ・画面状態を更新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      if (document.visibilityState === 'visible') {
        setPermissionStatus(getAndroidPermissionStatus());
        const pending = readPendingTargetApp();
        if (pending) {
          setTargetApp(pending);
        }

        const hiddenDuration = hiddenAtRef.current
          ? Date.now() - hiddenAtRef.current
          : 0;
        hiddenAtRef.current = null;

        if (pending || hiddenDuration >= 1500) {
          setStep('purpose_check');
          setStreak(0);
          setSelectedOption(null);
          setFeedbackState('idle');
          setPenaltySeconds(0);
          setCurrentChallenge(
            pickNextChallenge(settings.enabledCategories, settings.difficulty)
          );
        }
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

  const restrictedAppsPreview = useMemo(() => {
    const set = new Set(restrictedPackages);
    return installedApps.filter((app) => set.has(app.packageName));
  }, [installedApps, restrictedPackages]);

  const handleResetToStart = () => {
    setStep('purpose_check');
    setStreak(0);
    setSelectedOption(null);
    setFeedbackState('idle');
    setPenaltySeconds(0);
    setCurrentChallenge(pickNextChallenge(settings.enabledCategories, settings.difficulty));
  };

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
      setPenaltySeconds(2);
    }
  };

  const handleSubmitNumpadAnswer = (typedValue: string) => {
    if (feedbackState !== 'idle') return;
    if (typedValue.trim() === currentChallenge.correctAnswerText) {
      markChallengeSolved(currentChallenge.id);
      setFeedbackState('correct');
    } else {
      setFeedbackState('wrong');
      setPenaltySeconds(2);
    }
  };

  const handleClearStats = () => {
    setUnlockLogs(clearAllUnlockLogs());
  };

  const handleReturnToOriginalApp = useCallback((packageName: string) => {
    notifyUnlockComplete(packageName);
  }, []);

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-slate-900 flex flex-col justify-between max-w-md mx-auto select-none border-x border-slate-200/70">
      {/* スマホアプリ上部バー */}
      <header className="px-4 pt-3.5 pb-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleResetToStart}
          className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          IntentGate
        </button>

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

          {/* 制限アプリ一覧ボタン */}
          <button
            type="button"
            onClick={() => setIsRestrictedAppsOpen(true)}
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.header.apps}</span>
          </button>

          {/* 統計ボタン */}
          <button
            type="button"
            onClick={() => setIsStatsOpen(true)}
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.header.stats}</span>
          </button>

          {/* 難易度・設定ボタン */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label={t.settingsModal.title}
            className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </header>

      {/* Step 1: 6つの目的をタップしたら即座に問題へ */}
      {step === 'purpose_check' && (
        <PurposeStep
          language={language}
          targetApp={targetApp}
          restrictedAppsPreview={restrictedAppsPreview}
          restrictedCount={restrictedPackages.length}
          isNativeApp={isNativeApp}
          onSelectPurposeAndProceed={handleSelectPurposeAndProceed}
          onSimulateAppLaunch={handleSimulateAppLaunch}
          onClearTarget={handleClearTarget}
          onOpenRestrictedApps={() => setIsRestrictedAppsOpen(true)}
        />
      )}

      {/* Step 2: 全8ジャンルの問題画面 */}
      {step === 'challenge_gate' && (
        <ChallengeStep
          language={language}
          purposeLabel={selectedPurposeLabel}
          targetApp={targetApp}
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

      {/* Step 3: 解錠完了＆対象アプリへの自動復帰画面 */}
      {step === 'unlocked' && (
        <UnlockedStep
          language={language}
          purposeLabel={selectedPurposeLabel}
          targetApp={targetApp}
          todayCount={todayCount}
          onReturnToApp={handleReturnToOriginalApp}
          onOpenStats={() => setIsStatsOpen(true)}
          onSimulateScreenOffAndWake={handleResetToStart}
        />
      )}

      {/* 制限アプリ設定モーダル */}
      <RestrictedAppsModal
        isOpen={isRestrictedAppsOpen}
        language={language}
        installedApps={installedApps}
        restrictedPackages={restrictedPackages}
        permissionStatus={permissionStatus}
        onTogglePackage={handleToggleRestrictedPackage}
        onSimulateAppLaunch={handleSimulateAppLaunch}
        onClose={() => setIsRestrictedAppsOpen(false)}
      />

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
        restrictedCount={restrictedPackages.length}
        onUpdateSettings={setSettings}
        onOpenRestrictedApps={() => setIsRestrictedAppsOpen(true)}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
