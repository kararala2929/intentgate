/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { BarChart3, Trash2, X } from 'lucide-react';
import { PURPOSE_IDS, PURPOSE_COLORS } from '../config/constants';
import { buildWeeklyDailyStats } from '../data/statsStorage';
import { TRANSLATIONS } from '../i18n/translations';
import { Language, UnlockLogItem } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  language: Language;
  logs: UnlockLogItem[];
  onClearLogs: () => void;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  language,
  logs,
  onClearLogs,
  onClose,
}) => {
  const weeklyDays = useMemo(() => buildWeeklyDailyStats(logs), [logs]);
  const [selectedDateKey, setSelectedDateKey] = useState<string | 'all_week'>('all_week');

  if (!isOpen) return null;

  const t = TRANSLATIONS[language].statsModal;
  const tPurposes = TRANSLATIONS[language].purposes;

  const todayStat = weeklyDays[weeklyDays.length - 1];
  const weekTotal = weeklyDays.reduce((sum, d) => sum + d.totalCount, 0);
  const dailyAverage = Math.round((weekTotal / 7) * 10) / 10;
  const maxDayCount = Math.max(...weeklyDays.map((d) => d.totalCount), 5);

  const selectedDayObj =
    selectedDateKey === 'all_week'
      ? null
      : weeklyDays.find((d) => d.dateKey === selectedDateKey) || null;

  // 目的別の集計（週間全体 または 選択した日付）
  const purposeCounts = PURPOSE_IDS.map((id) => {
    const count = selectedDayObj
      ? selectedDayObj.byPurpose[id] || 0
      : weeklyDays.reduce((acc, d) => acc + (d.byPurpose[id] || 0), 0);
    return {
      id,
      label: tPurposes[id].label,
      barColor: PURPOSE_COLORS[id],
      count,
    };
  });

  const maxPurposeCount = Math.max(...purposeCounts.map((p) => p.count), 1);
  const targetTotal = selectedDayObj ? selectedDayObj.totalCount : weekTotal;

  const getDayLabel = (dateKey: string): string => {
    const parts = dateKey.split('-').map(Number);
    if (parts.length === 3) {
      const dt = new Date(parts[0], parts[1] - 1, parts[2]);
      return t.days[dt.getDay()] || '';
    }
    return '';
  };

  const handleConfirmClear = () => {
    if (window.confirm(t.clearConfirm)) {
      onClearLogs();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 text-slate-900 shadow-xl space-y-5">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 上部サマリー3指標 */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] text-slate-500">{t.todayCount}</p>
            <p className="text-2xl font-bold font-mono-tabular text-emerald-600 mt-0.5">
              {todayStat?.totalCount ?? 0}
              <span className="text-xs font-normal text-slate-500 ml-1">{t.unitTimes}</span>
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] text-slate-500">{t.weekTotal}</p>
            <p className="text-2xl font-bold font-mono-tabular text-slate-900 mt-0.5">
              {weekTotal}
              <span className="text-xs font-normal text-slate-500 ml-1">{t.unitTimes}</span>
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] text-slate-500">{t.dailyAvg}</p>
            <p className="text-2xl font-bold font-mono-tabular text-slate-700 mt-0.5">
              {dailyAverage}
              <span className="text-xs font-normal text-slate-500 ml-1">{t.unitTimes}</span>
            </p>
          </div>
        </div>

        {/* 1週間分の縦棒グラフ（日別推移） */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800">
              {t.dailyChartTitle}
            </span>
            {selectedDateKey !== 'all_week' && (
              <button
                type="button"
                onClick={() => setSelectedDateKey('all_week')}
                className="text-[11px] text-emerald-700 font-semibold underline"
              >
                {t.resetToWeek}
              </button>
            )}
          </div>

          {/* 棒グラフエリア */}
          <div className="h-44 pt-4 pb-1 grid grid-cols-7 gap-2 items-end border-b border-slate-200">
            {weeklyDays.map((day) => {
              const heightPercent =
                day.totalCount === 0
                  ? 4
                  : Math.max(10, Math.round((day.totalCount / maxDayCount) * 100));
              const isSelected = selectedDateKey === day.dateKey;

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() =>
                    setSelectedDateKey(isSelected ? 'all_week' : day.dateKey)
                  }
                  className="h-full flex flex-col items-center justify-end group focus:outline-none"
                >
                  {/* 回数ラベル */}
                  <span
                    className={`text-[11px] font-mono-tabular mb-1 ${
                      day.isToday || isSelected
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {day.totalCount}
                  </span>

                  {/* 積み上げ棒本体 */}
                  <div
                    className={`w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all ${
                      isSelected
                        ? 'ring-2 ring-slate-900'
                        : day.isToday
                        ? 'ring-1 ring-emerald-500'
                        : 'opacity-85 group-hover:opacity-100'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    {day.totalCount === 0 ? (
                      <div className="w-full h-full bg-slate-200" />
                    ) : (
                      PURPOSE_IDS.map((pId) => {
                        const pCount = day.byPurpose[pId] || 0;
                        if (pCount === 0) return null;
                        const segPercent = (pCount / day.totalCount) * 100;
                        return (
                          <div
                            key={pId}
                            style={{
                              height: `${segPercent}%`,
                              backgroundColor: PURPOSE_COLORS[pId],
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 曜日・日付ラベル */}
          <div className="grid grid-cols-7 gap-2 pt-2 text-center">
            {weeklyDays.map((day) => {
              const isSelected = selectedDateKey === day.dateKey;
              const dayLabel = getDayLabel(day.dateKey);
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() =>
                    setSelectedDateKey(isSelected ? 'all_week' : day.dateKey)
                  }
                  className="flex flex-col items-center"
                >
                  <span
                    className={`text-[11px] font-bold ${
                      day.isToday
                        ? 'text-emerald-700'
                        : isSelected
                        ? 'text-slate-900'
                        : 'text-slate-600'
                    }`}
                  >
                    {day.isToday ? t.todayText : dayLabel}
                  </span>
                  <span className="text-[10px] font-mono-tabular text-slate-400">
                    {day.shortDate}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 目的別の内訳横棒グラフ */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {selectedDayObj
                ? t.breakdownDay
                    .replace('{date}', selectedDayObj.shortDate)
                    .replace('{day}', getDayLabel(selectedDayObj.dateKey))
                : t.breakdownWeek}
            </span>
            <span className="text-xs font-mono-tabular text-slate-500">
              {t.totalCountText.replace('{count}', String(targetTotal))}
            </span>
          </div>

          <div className="space-y-2.5">
            {purposeCounts.map((item) => {
              const widthPercent =
                item.count === 0
                  ? 0
                  : Math.max(6, Math.round((item.count / maxPurposeCount) * 100));
              const sharePercent =
                targetTotal > 0 ? Math.round((item.count / targetTotal) * 100) : 0;

              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: item.barColor }}
                      />
                      <span className="font-semibold text-slate-800">{item.label}</span>
                    </div>
                    <span className="font-mono-tabular text-slate-600">
                      {t.countAndPercent
                        .replace('{count}', String(item.count))
                        .replace('{percent}', String(sharePercent))}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: item.barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* フッターボタン */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirmClear}
            className="min-h-[48px] px-4 rounded-2xl bg-slate-100 hover:bg-rose-50 border border-slate-200 text-xs text-slate-600 hover:text-rose-700 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.clearHistory}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
