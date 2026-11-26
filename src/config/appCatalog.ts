/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstalledAppInfo } from '../types';

/**
 * Android主要アプリのパッケージ名・ブランド色・ブラウザプレビュー用カタログ
 * Android実機ではPackageManagerからインストール済みアプリ一覧を取得し、
 * ブラウザプレビュー時およびブランド色補完にこのカタログを使用する。
 */
export const APP_CATALOG: InstalledAppInfo[] = [
  {
    packageName: 'com.google.android.youtube',
    appName: 'YouTube',
    iconKey: 'youtube',
    brandColor: '#DC2626',
    bgTint: '#FEF2F2',
    borderTint: '#FECACA',
  },
  {
    packageName: 'com.twitter.android',
    appName: 'X (Twitter)',
    iconKey: 'x',
    brandColor: '#0F172A',
    bgTint: '#F1F5F9',
    borderTint: '#CBD5E1',
  },
  {
    packageName: 'com.instagram.android',
    appName: 'Instagram',
    iconKey: 'instagram',
    brandColor: '#DB2777',
    bgTint: '#FDF2F8',
    borderTint: '#FBCFE8',
  },
  {
    packageName: 'jp.naver.line.android',
    appName: 'LINE',
    iconKey: 'line',
    brandColor: '#059669',
    bgTint: '#ECFDF5',
    borderTint: '#A7F3D0',
  },
  {
    packageName: 'com.zhiliaoapp.musically',
    appName: 'TikTok',
    iconKey: 'tiktok',
    brandColor: '#111827',
    bgTint: '#F3F4F6',
    borderTint: '#D1D5DB',
  },
  {
    packageName: 'com.ss.android.ugc.trill',
    appName: 'TikTok (Asia)',
    iconKey: 'tiktok',
    brandColor: '#111827',
    bgTint: '#F3F4F6',
    borderTint: '#D1D5DB',
  },
  {
    packageName: 'com.instagram.barcelona',
    appName: 'Threads',
    iconKey: 'threads',
    brandColor: '#18181B',
    bgTint: '#F4F4F5',
    borderTint: '#D4D4D8',
  },
  {
    packageName: 'com.netflix.mediaclient',
    appName: 'Netflix',
    iconKey: 'netflix',
    brandColor: '#B91C1C',
    bgTint: '#FEF2F2',
    borderTint: '#FCA5A5',
  },
  {
    packageName: 'tv.twitch.android.app',
    appName: 'Twitch',
    iconKey: 'twitch',
    brandColor: '#7C3AED',
    bgTint: '#F5F3FF',
    borderTint: '#DDD6FE',
  },
  {
    packageName: 'com.reddit.frontpage',
    appName: 'Reddit',
    iconKey: 'reddit',
    brandColor: '#EA580C',
    bgTint: '#FFF7ED',
    borderTint: '#FED7AA',
  },
  {
    packageName: 'com.discord',
    appName: 'Discord',
    iconKey: 'discord',
    brandColor: '#4F46E5',
    bgTint: '#EEF2FF',
    borderTint: '#C7D2FE',
  },
  {
    packageName: 'com.android.chrome',
    appName: 'Chrome',
    iconKey: 'chrome',
    brandColor: '#2563EB',
    bgTint: '#EFF6FF',
    borderTint: '#BFDBFE',
  },
];

/** ブラウザプレビュー時の主要アプリ一覧（TikTok重複を除外） */
export const PREVIEW_INSTALLED_APPS: InstalledAppInfo[] = APP_CATALOG.filter(
  (app) => app.packageName !== 'com.ss.android.ugc.trill'
);

export function findCatalogApp(identifier?: string | null): InstalledAppInfo | null {
  if (!identifier) return null;
  const target = identifier.trim().toLowerCase();
  return (
    APP_CATALOG.find(
      (item) =>
        item.packageName.toLowerCase() === target ||
        item.appName.toLowerCase() === target ||
        item.iconKey === target
    ) || null
  );
}
