/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Power, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { ALL_CATEGORIES } from '../config/constants';
import { TRANSLATIONS } from '../i18n/translations';
import { AppSettings, ChallengeCategory, DifficultyLevel, Language } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  language: Language;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  language,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[language].settingsModal;
  const tDiffs = TRANSLATIONS[language].difficulties;
  const tCats = TRANSLATIONS[language].categories;

  const toggleGateEnabled = () => {
    onUpdateSettings({ ...settings, isGateEnabled: !settings.isGateEnabled });
  };

  const toggleCategory = (cat: ChallengeCategory) => {
    const exists = settings.enabledCategories.includes(cat);
    if (exists && settings.enabledCategories.length === 1) return;
    const nextCats = exists
      ? settings.enabledCategories.filter((c) => c !== cat)
      : [...settings.enabledCategories, cat];
    onUpdateSettings({ ...settings, enabledCategories: nextCats });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl p-6 text-slate-900 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ロック解除時の自動起動 ON/OFF スイッチ */}
        <div className="p-4 rounded-2xl border transition-all duration-200 bg-slate-50/80 border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  settings.isGateEnabled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                {settings.isGateEnabled ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {settings.isGateEnabled ? t.gateEnabledLabel : t.gateDisabledLabel}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {settings.isGateEnabled ? t.gateEnabledDesc : t.gateDisabledDesc}
                </p>
              </div>
            </div>

            {/* トグルスイッチ本体 */}
            <button
              type="button"
              role="switch"
              aria-checked={settings.isGateEnabled}
              onClick={toggleGateEnabled}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.isGateEnabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.isGateEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 難易度（3段階） */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">
            {t.difficultySection}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as DifficultyLevel[]).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, difficulty: lv })}
                className={`min-h-[48px] rounded-xl text-sm font-bold border transition-colors ${
                  settings.difficulty === lv
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tDiffs[lv]}
              </button>
            ))}
          </div>
        </div>

        {/* 出題ジャンル（全8ジャンル） */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">
            {t.categorySection}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_CATEGORIES.map((catId) => {
              const active = settings.enabledCategories.includes(catId);
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => toggleCategory(catId)}
                  className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tCats[catId]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 問題数 */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">
            {t.streakSection}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, requiredStreak: count })
                }
                className={`min-h-[48px] rounded-xl text-sm font-mono-tabular font-bold border transition-colors ${
                  settings.requiredStreak === count
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.streakCountLabel.replace('{count}', String(count))}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[52px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};
