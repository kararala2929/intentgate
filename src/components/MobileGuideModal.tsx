/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Smartphone, X } from 'lucide-react';
import { Language } from '../types';

interface MobileGuideModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
}

export const MobileGuideModal: React.FC<MobileGuideModalProps> = ({
  isOpen,
  language,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // 公開URL（現在のウィンドウURLまたは共有URL）
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    currentUrl
  )}`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isJa = language === 'ja';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 text-slate-900 shadow-xl space-y-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Smartphone className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {isJa ? '自分のスマホで使う方法' : 'Use on your Android phone'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QRコードセクション */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center text-center">
          <p className="text-xs font-bold text-slate-700 mb-3">
            {isJa
              ? '① スマホのカメラでQRコードを読み取る'
              : '1. Scan this QR code with your phone camera'}
          </p>

          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs mb-3">
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-44 h-44 object-contain"
              loading="lazy"
            />
          </div>

          <div className="w-full flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 min-h-[38px] px-3 text-[11px] font-mono-tabular bg-white border border-slate-200 rounded-xl text-slate-600 select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isJa ? 'コピー済' : 'Copied') : isJa ? 'URLコピー' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Androidホーム画面追加の3ステップ */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2.5">
          <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
            <span>
              {isJa
                ? '② アプリ化して全画面で動かす（PWA）'
                : '2. Install as full-screen app (PWA)'}
            </span>
          </p>

          <div className="space-y-1.5 text-xs text-emerald-900/90 leading-relaxed pl-1">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                {isJa
                  ? 'スマホのChromeでページを開く'
                  : 'Open the URL in Chrome on Android'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>
                {isJa
                  ? '右上の「︙（メニュー）」をタップ'
                  : 'Tap the three dots (⋮) menu on the top-right'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>
                {isJa
                  ? '「ホーム画面に追加」または「アプリをインストール」を選択'
                  : 'Tap "Add to Home screen" or "Install app"'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-emerald-800 bg-white/70 p-2 rounded-xl mt-2">
            💡{' '}
            {isJa
              ? 'ホーム画面に本物のアプリアイコンが作られ、アドレスバー無しの全画面ネイティブアプリとして動きます！'
              : 'An icon will be added to your home screen and it will launch full-screen like a native app!'}
          </p>
        </div>

        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
        >
          {isJa ? '閉じる' : 'Close'}
        </button>
      </div>
    </div>
  );
};
