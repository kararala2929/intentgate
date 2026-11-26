/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight, Shield, X } from 'lucide-react';
import { getPurposeOptions } from '../config/constants';
import { TRANSLATIONS } from '../i18n/translations';
import { ActiveTargetApp, InstalledAppInfo, Language } from '../types';
import { TargetAppIcon } from './TargetAppIcon';

interface PurposeStepProps {
  language: Language;
  targetApp: ActiveTargetApp | null;
  restrictedAppsPreview: InstalledAppInfo[];
  restrictedCount: number;
  isNativeApp: boolean;
  onSelectPurposeAndProceed: (id: string) => void;
  onSimulateAppLaunch: (app: InstalledAppInfo) => void;
  onClearTarget: () => void;
  onOpenRestrictedApps: () => void;
}

export const PurposeStep: React.FC<PurposeStepProps> = ({
  language,
  targetApp,
  restrictedAppsPreview,
  restrictedCount,
  isNativeApp,
  onSelectPurposeAndProceed,
  onSimulateAppLaunch,
  onClearTarget,
  onOpenRestrictedApps,
}) => {
  const t = TRANSLATIONS[language].purposeStep;
  const purposeOptions = getPurposeOptions(language);

  const headline = targetApp
    ? t.titleWithTarget.replace('{app}', targetApp.appName)
    : t.title;

  return (
    <div className="flex-1 flex flex-col justify-between px-5 py-5">
      <div className="my-auto py-2">
        {/* 制限対象アプリの起動を検知して割り込んだ時のバナー */}
        {targetApp && (
          <div className="mb-5 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <TargetAppIcon
                packageName={targetApp.packageName}
                appName={targetApp.appName}
                iconBase64={targetApp.iconBase64}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {t.targetBannerTitle.replace('{app}', targetApp.appName)}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {t.targetBannerSubtitle.replace('{app}', targetApp.appName)}
                </p>
              </div>
            </div>
            {!isNativeApp && (
              <button
                type="button"
                onClick={onClearTarget}
                aria-label={t.clearTarget}
                title={t.clearTarget}
                className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <p className="text-xs font-semibold text-emerald-700 mb-1">{t.stepTag}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2 text-balance">
          {headline}
        </h1>
        <p className="text-xs text-slate-500 mb-5">{t.subtitle}</p>

        {/* 6つの目的ボタン（白基調・タップした瞬間に次の画面へ進む） */}
        <div className="grid grid-cols-2 gap-3.5">
          {purposeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectPurposeAndProceed(option.id)}
              className="min-h-[92px] p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-500 shadow-xs text-left flex flex-col justify-between transition-all active:scale-[0.97]"
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

      {/* 下部：制限アプリ選択画面への導線（＆ブラウザプレビュー時は制限中アプリのテスト起動） */}
      <div className="pt-4 mt-2 border-t border-slate-200/80 space-y-2.5">
        {!targetApp && !isNativeApp && restrictedAppsPreview.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-slate-500 mb-2">
              {t.quickTestLabel}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {restrictedAppsPreview.slice(0, 4).map((app) => (
                <button
                  key={app.packageName}
                  type="button"
                  onClick={() => onSimulateAppLaunch(app)}
                  className="min-h-[44px] px-2 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-1 transition-colors active:scale-[0.97]"
                >
                  <TargetAppIcon
                    packageName={app.packageName}
                    appName={app.appName}
                    iconBase64={app.iconBase64}
                    size="sm"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 truncate max-w-full">
                    {app.appName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenRestrictedApps}
          className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors"
        >
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {t.manageAppsButton.replace('{count}', String(restrictedCount))}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>
    </div>
  );
};
