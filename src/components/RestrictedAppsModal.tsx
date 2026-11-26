/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Check, Play, Search, ShieldAlert, Smartphone, X } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import {
  AndroidPermissionStatus,
  InstalledAppInfo,
  Language,
} from '../types';
import {
  requestOverlayPermission,
  requestUsageStatsPermission,
} from '../utils/androidBridge';
import { TargetAppIcon } from './TargetAppIcon';

interface RestrictedAppsModalProps {
  isOpen: boolean;
  language: Language;
  installedApps: InstalledAppInfo[];
  restrictedPackages: string[];
  permissionStatus: AndroidPermissionStatus;
  onTogglePackage: (packageName: string) => void;
  onSimulateAppLaunch: (app: InstalledAppInfo) => void;
  onClose: () => void;
}

export const RestrictedAppsModal: React.FC<RestrictedAppsModalProps> = ({
  isOpen,
  language,
  installedApps,
  restrictedPackages,
  permissionStatus,
  onTogglePackage,
  onSimulateAppLaunch,
  onClose,
}) => {
  const [query, setQuery] = useState<string>('');

  const restrictedSet = useMemo(
    () => new Set(restrictedPackages),
    [restrictedPackages]
  );

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? installedApps.filter(
          (app) =>
            app.appName.toLowerCase().includes(q) ||
            app.packageName.toLowerCase().includes(q)
        )
      : installedApps;

    return [...list].sort((a, b) => {
      const aOn = restrictedSet.has(a.packageName) ? 0 : 1;
      const bOn = restrictedSet.has(b.packageName) ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return a.appName.localeCompare(b.appName);
    });
  }, [installedApps, query, restrictedSet]);

  if (!isOpen) return null;

  const t = TRANSLATIONS[language].restrictedAppsModal;
  const needsNativePermissions =
    permissionStatus.isNative &&
    (!permissionStatus.hasUsageStats || !permissionStatus.hasOverlay);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[92dvh] flex flex-col bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl text-slate-900 shadow-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{t.title}</h2>
                <p className="text-[11px] font-mono-tabular text-slate-500">
                  {t.activeSummary
                    .replace('{count}', String(restrictedPackages.length))
                    .replace('{total}', String(installedApps.length))}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="min-w-[44px] min-h-[44px] rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">{t.subtitle}</p>

          {/* Android実機で権限が不足している場合のワンタップ設定カード */}
          {needsNativePermissions && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{t.permissionWarningTitle}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-950 truncate">
                    {t.usagePermissionLabel}
                  </span>
                  {permissionStatus.hasUsageStats ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      {t.permissionGranted}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={requestUsageStatsPermission}
                      className="min-h-[34px] px-3 rounded-lg bg-slate-900 text-white text-[11px] font-bold shrink-0"
                    >
                      {t.grantPermissionButton}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-950 truncate">
                    {t.overlayPermissionLabel}
                  </span>
                  {permissionStatus.hasOverlay ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      {t.permissionGranted}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={requestOverlayPermission}
                      className="min-h-[34px] px-3 rounded-lg bg-slate-900 text-white text-[11px] font-bold shrink-0"
                    >
                      {t.grantPermissionButton}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 検索ボックス */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* インストール済みアプリ一覧 */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-5">
          {filteredApps.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {t.noResults}
            </div>
          ) : (
            filteredApps.map((app) => {
              const isOn = restrictedSet.has(app.packageName);
              return (
                <div
                  key={app.packageName}
                  className="py-3 flex items-center justify-between gap-2.5"
                >
                  <button
                    type="button"
                    onClick={() => onTogglePackage(app.packageName)}
                    className="flex-1 min-w-0 min-h-[44px] flex items-center gap-3 text-left"
                  >
                    <TargetAppIcon
                      packageName={app.packageName}
                      appName={app.appName}
                      iconBase64={app.iconBase64}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {app.appName}
                      </p>
                      <p className="text-[11px] font-mono-tabular text-slate-400 truncate">
                        {app.packageName}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Webプレビュー時はその場ですぐ割り込み体験をテスト可能 */}
                    {!permissionStatus.isNative && isOn && (
                      <button
                        type="button"
                        onClick={() => {
                          onSimulateAppLaunch(app);
                          onClose();
                        }}
                        className="min-h-[36px] px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <Play className="w-3 h-3 shrink-0" />
                        <span>{t.testLaunchButton}</span>
                      </button>
                    )}

                    {/* ON/OFFトグルスイッチ */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      aria-label={app.appName}
                      onClick={() => onTogglePackage(app.packageName)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        isOn ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isOn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* フッター完了ボタン */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
