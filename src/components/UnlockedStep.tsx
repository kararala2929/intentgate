/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BarChart3, Power, Unlock } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import { Language } from '../types';

interface UnlockedStepProps {
  language: Language;
  purposeLabel: string;
  todayCount: number;
  onOpenStats: () => void;
  onSimulateScreenOffAndWake: () => void;
}

export const UnlockedStep: React.FC<UnlockedStepProps> = ({
  language,
  purposeLabel,
  todayCount,
  onOpenStats,
  onSimulateScreenOffAndWake,
}) => {
  const t = TRANSLATIONS[language].unlockedStep;

  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-8">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5 text-emerald-600 shadow-2xs">
          <Unlock className="w-8 h-8" />
        </div>
        <p className="text-xs text-emerald-700 font-semibold mb-1">{t.tag}</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {t.purposePrefix}
          {purposeLabel}
        </h2>
        <p className="text-xs text-slate-500 font-mono-tabular mb-6">
          {t.todayCount.replace('{count}', String(todayCount))}
        </p>

        {/* ホーム画面からアプリを開いた時にもすぐ見られる統計ボタン */}
        <button
          type="button"
          onClick={onOpenStats}
          className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs text-slate-800 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>{t.openStatsButton}</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onSimulateScreenOffAndWake}
        className="w-full min-h-[54px] px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]"
      >
        <Power className="w-5 h-5" />
        <span>{t.simulateLockButton}</span>
      </button>
    </div>
  );
};
