/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { getPurposeOptions } from '../config/constants';
import { TRANSLATIONS } from '../i18n/translations';
import { Language } from '../types';

interface PurposeStepProps {
  language: Language;
  onSelectPurposeAndProceed: (id: string) => void;
}

export const PurposeStep: React.FC<PurposeStepProps> = ({
  language,
  onSelectPurposeAndProceed,
}) => {
  const t = TRANSLATIONS[language].purposeStep;
  const purposeOptions = getPurposeOptions(language);

  return (
    <div className="flex-1 flex flex-col justify-center px-5 py-6">
      <div>
        <p className="text-xs font-semibold text-emerald-700 mb-1">{t.stepTag}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {t.title}
        </h1>
        <p className="text-xs text-slate-500 mb-6">
          {t.subtitle}
        </p>

        {/* 6つの目的ボタン（白基調・タップした瞬間に次の画面へ進む） */}
        <div className="grid grid-cols-2 gap-3.5">
          {purposeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectPurposeAndProceed(option.id)}
              className="min-h-[96px] p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-500 shadow-xs text-left flex flex-col justify-between transition-all active:scale-[0.97]"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-lg font-bold text-slate-900 tracking-tight">
                  {option.label}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
              <span className="text-xs text-slate-500 truncate">
                {option.subLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
