/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { findCatalogApp, PREVIEW_INSTALLED_APPS } from '../config/appCatalog';
import {
  DEFAULT_RESTRICTED_PACKAGES,
  STORAGE_KEY_RESTRICTED_PACKAGES,
} from '../config/constants';
import {
  ActiveTargetApp,
  AndroidPermissionStatus,
  InstalledAppInfo,
} from '../types';

interface NativeAndroidBridge {
  isNativeApp?: () => boolean;
  isGateEnabled?: () => boolean;
  setGateEnabled?: (enabled: boolean) => void;
  getInstalledApps?: () => string;
  getRestrictedPackages?: () => string;
  setRestrictedPackages?: (packagesJson: string) => void;
  getPendingTargetApp?: () => string;
  clearPendingTargetApp?: () => void;
  unlockAndReturnToApp?: (packageName: string) => void;
  unlockAndDismiss?: () => void;
  hasUsageStatsPermission?: () => boolean;
  openUsageStatsSettings?: () => void;
  hasOverlayPermission?: () => boolean;
  openOverlaySettings?: () => void;
}

function getBridge(): NativeAndroidBridge | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    AndroidBridge?: NativeAndroidBridge;
    Android?: NativeAndroidBridge;
  };
  return win.AndroidBridge ?? win.Android ?? null;
}

export function isRunningInNativeAndroid(): boolean {
  try {
    const bridge = getBridge();
    return Boolean(bridge?.isNativeApp?.());
  } catch {
    return false;
  }
}

export function getAndroidPermissionStatus(): AndroidPermissionStatus {
  const bridge = getBridge();
  const isNative = Boolean(bridge?.isNativeApp?.());
  if (!isNative) {
    return {
      isNative: false,
      hasOverlay: true,
      hasUsageStats: true,
    };
  }
  return {
    isNative: true,
    hasOverlay: Boolean(bridge?.hasOverlayPermission?.() ?? true),
    hasUsageStats: Boolean(bridge?.hasUsageStatsPermission?.() ?? false),
  };
}

export function requestUsageStatsPermission(): void {
  try {
    getBridge()?.openUsageStatsSettings?.();
  } catch {
    // ignore
  }
}

export function requestOverlayPermission(): void {
  try {
    getBridge()?.openOverlaySettings?.();
  } catch {
    // ignore
  }
}

/**
 * 端末にインストール済みのアプリ一覧を取得
 * Android実機ではPackageManager経由のJSONをパースし、Webプレビューでは主要アプリ一覧を返す
 */
export function loadInstalledApps(): InstalledAppInfo[] {
  const bridge = getBridge();
  if (bridge?.getInstalledApps) {
    try {
      const raw = bridge.getInstalledApps();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: InstalledAppInfo) => {
          const catalog = findCatalogApp(item.packageName);
          return {
            packageName: item.packageName,
            appName: item.appName || catalog?.appName || item.packageName,
            iconBase64: item.iconBase64,
            iconKey: catalog?.iconKey,
            brandColor: catalog?.brandColor || '#0F172A',
            bgTint: catalog?.bgTint || '#F1F5F9',
            borderTint: catalog?.borderTint || '#CBD5E1',
          };
        });
      }
    } catch (e) {
      console.warn('[IntentGate] Failed to parse getInstalledApps:', e);
    }
  }
  return PREVIEW_INSTALLED_APPS;
}

/**
 * 制限対象パッケージリストを読み込み
 */
export function loadRestrictedPackages(): string[] {
  const bridge = getBridge();
  if (bridge?.getRestrictedPackages) {
    try {
      const raw = bridge.getRestrictedPackages();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string');
      }
    } catch {
      // fallback to localStorage
    }
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY_RESTRICTED_PACKAGES);
    if (!saved) {
      localStorage.setItem(
        STORAGE_KEY_RESTRICTED_PACKAGES,
        JSON.stringify(DEFAULT_RESTRICTED_PACKAGES)
      );
      return DEFAULT_RESTRICTED_PACKAGES;
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : DEFAULT_RESTRICTED_PACKAGES;
  } catch {
    return DEFAULT_RESTRICTED_PACKAGES;
  }
}

/**
 * 制限対象パッケージリストを保存し、Androidネイティブ側へ同期
 */
export function saveRestrictedPackages(packages: string[]): void {
  const unique = Array.from(new Set(packages));
  try {
    localStorage.setItem(STORAGE_KEY_RESTRICTED_PACKAGES, JSON.stringify(unique));
  } catch {
    // ignore
  }

  try {
    const bridge = getBridge();
    if (bridge?.setRestrictedPackages) {
      bridge.setRestrictedPackages(JSON.stringify(unique));
    }
  } catch (e) {
    console.warn('[IntentGate] sync setRestrictedPackages failed:', e);
  }
}

/**
 * 割り込み起動元となった対象アプリを取得（Android Intent Extra / AndroidBridge経由）
 */
export function readPendingTargetApp(): ActiveTargetApp | null {
  try {
    const bridge = getBridge();
    if (bridge?.getPendingTargetApp) {
      const raw = bridge.getPendingTargetApp();
      if (raw && raw !== 'null') {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.packageName === 'string' && parsed.packageName) {
          const catalog = findCatalogApp(parsed.packageName);
          return {
            packageName: parsed.packageName,
            appName: parsed.appName || catalog?.appName || parsed.packageName,
            iconBase64: parsed.iconBase64,
          };
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearPendingTargetApp(): void {
  try {
    getBridge()?.clearPendingTargetApp?.();
  } catch {
    // ignore
  }
}

/**
 * クイズクリア後、Androidネイティブ側へ通知して元の制限アプリを起動しIntentGateを終了する
 */
export function notifyUnlockComplete(targetPackageName?: string): void {
  try {
    const bridge = getBridge();
    if (targetPackageName && bridge?.unlockAndReturnToApp) {
      bridge.unlockAndReturnToApp(targetPackageName);
      return;
    }
    if (bridge?.unlockAndDismiss) {
      bridge.unlockAndDismiss();
    }
  } catch (e) {
    console.warn('[IntentGate] notifyUnlockComplete failed:', e);
  }
}

export function syncNativeGateEnabled(enabled: boolean): void {
  try {
    getBridge()?.setGateEnabled?.(enabled);
  } catch (e) {
    console.warn('[IntentGate] sync setGateEnabled failed:', e);
  }
}

export function readNativeGateEnabled(): boolean | null {
  try {
    const bridge = getBridge();
    if (bridge?.isGateEnabled) {
      const val = bridge.isGateEnabled();
      return typeof val === 'boolean' ? val : null;
    }
  } catch {
    // ignore
  }
  return null;
}
