/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BarChart3, ExternalLink, RotateCcw, Unlock } from 'lucide-react';
import { findCatalogApp } from '../config/appCatalog';
import { AUTO_RETURN_SECONDS } from '../config/constants';
import { TRANSLATIONS } from '../i18n/translations';
import { ActiveTargetApp, Language } from '../types';
import { TargetAppIcon } from './TargetAppIcon';

interface UnlockedStepProps {
  language: Language;
  purposeLabel: string;
  targetApp: ActiveTargetApp | null;
  todayCount: number;
  onReturnToApp: (packageName: string) => void;
  onOpenStats: () => void;
  onSimulateScreenOffAndWake: () => void;
}

export const UnlockedStep: React.FC<UnlockedStepProps> = ({
  language,
  purposeLabel,
  targetApp,
  todayCount,
  onReturnToApp,
  onOpenStats,
  onSimulateScreenOffAndWake,
}) => {
  const [countdown, setCountdown] = useState<number>(AUTO_RETURN_SECONDS);
  const [returnStatus, setReturnStatus] = useState<
    'counting' | 'returned' | 'cancelled'
  >(targetApp ? 'counting' : 'cancelled');

  const t = TRANSLATIONS[language].unlockedStep;
  const catalogApp = targetApp ? findCatalogApp(targetApp.packageName) : null;
  const buttonColor = catalogApp?.brandColor || '#059669';

  useEffect(() => {
    if (!targetApp) {
      setReturnStatus('cancelled');
      return;
    }
    setCountdown(AUTO_RETURN_SECONDS);
    setReturnStatus('counting');
  }, [targetApp]);

  useEffect(() => {
    if (!targetApp || returnStatus !== 'counting') return;

    if (countdown <= 0) {
      setReturnStatus('returned');
      onReturnToApp(targetApp.packageName);
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [targetApp, returnStatus, countdown, onReturnToApp]);

  const handleReturnNow = () => {
    if (!targetApp) return;
    setReturnStatus('returned');
    onReturnToApp(targetApp.packageName);
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-7">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {targetApp ? (
          <div className="mb-4">
            <TargetAppIcon
              packageName={targetApp.packageName}
              appName={targetApp.appName}
              iconBase64={targetApp.iconBase64}
              size="lg"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5 text-emerald-600 shadow-2xs">
            <Unlock className="w-8 h-8" />
          </div>
        )}

        <p className="text-xs text-emerald-700 font-semibold mb-1">
          {targetApp
            ? t.tagWithTarget.replace('{app}', targetApp.appName)
            : t.tag}
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mb-1.5">
          {t.purposePrefix}
          {purposeLabel}
        </h2>

        <p className="text-xs text-slate-500 font-mono-tabular mb-5">
          {t.todayCount.replace('{count}', String(todayCount))}
        </p>

        {/* クイズ完了後に元のアプリへ自動復帰するカード */}
        {targetApp && (
          <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 mb-4">
            <div className="text-sm font-bold text-slate-900 font-mono-tabular">
              {returnStatus === 'counting' &&
                t.returningCountdown
                  .replace('{sec}', String(countdown))
                  .replace('{app}', targetApp.appName)}
              {returnStatus === 'returned' &&
                t.returnedMessage.replace('{app}', targetApp.appName)}
              {returnStatus === 'cancelled' && t.returnCancelledMessage}
            </div>

            <button
              type="button"
              onClick={handleReturnNow}
              className="w-full min-h-[50px] px-4 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-[0.98]"
              style={{ backgroundColor: buttonColor }}
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>
                {t.returnNowButton.replace('{app}', targetApp.appName)}
              </span>
            </button>

            {returnStatus === 'counting' && (
              <button
                type="button"
                onClick={() => setReturnStatus('cancelled')}
                className="w-full min-h-[40px] text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                {t.cancelReturnButton}
              </button>
            )}
          </div>
        )}

        {/* 統計モーダルを開く */}
        <button
          type="button"
          onClick={onOpenStats}
          className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs text-slate-800 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t.openStatsButton}</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onSimulateScreenOffAndWake}
        className="w-full min-h-[52px] mt-4 px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]"
      >
        <RotateCcw className="w-4 h-4 shrink-0" />
        <span>
          {targetApp
            ? t.retrySameAppButton.replace('{app}', targetApp.appName)
            : t.simulateLockButton}
        </span>
      </button>
    </div>
  );
};
