'use client';

import { Download, Share } from 'lucide-react';
import { useEffect, useState } from 'react';

import TextActionButton from '@/components/common/ui/text-action-button';
import type { BeforeInstallPromptEvent } from '@/utils/pwa';
import {
  clearStoredPwaInstallPrompt,
  isIosSafari,
  isStandaloneDisplayMode,
  PWA_INSTALL_MENU_MEDIA_QUERY,
  PWA_INSTALL_PROMPT_CLEARED_EVENT,
  PWA_INSTALL_PROMPT_READY_EVENT,
  readStoredPwaInstallPrompt,
} from '@/utils/pwa';

type InstallMode = 'android' | 'ios' | undefined;

export default function PwaInstallMenuItem({
  onInstalled,
}: {
  onInstalled?: () => void;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<InstallMode>();

  useEffect(() => {
    const mobileViewport = window.matchMedia(PWA_INSTALL_MENU_MEDIA_QUERY);

    const syncInstallMode = () => {
      if (!mobileViewport.matches || isStandaloneDisplayMode()) {
        setDeferredPrompt(null);
        setMode(undefined);
        return;
      }

      const storedPrompt = readStoredPwaInstallPrompt();
      if (storedPrompt) {
        setDeferredPrompt(storedPrompt);
        setMode('android');
        return;
      }

      setDeferredPrompt(null);
      setMode(
        isIosSafari(
          navigator.userAgent,
          navigator.vendor,
          navigator.maxTouchPoints,
        )
          ? 'ios'
          : undefined,
      );
    };

    const handlePromptReady = () => syncInstallMode();
    const handlePromptCleared = () => {
      syncInstallMode();
      onInstalled?.();
    };

    syncInstallMode();
    mobileViewport.addEventListener('change', syncInstallMode);
    window.addEventListener(PWA_INSTALL_PROMPT_READY_EVENT, handlePromptReady);
    window.addEventListener(
      PWA_INSTALL_PROMPT_CLEARED_EVENT,
      handlePromptCleared,
    );

    return () => {
      mobileViewport.removeEventListener('change', syncInstallMode);
      window.removeEventListener(
        PWA_INSTALL_PROMPT_READY_EVENT,
        handlePromptReady,
      );
      window.removeEventListener(
        PWA_INSTALL_PROMPT_CLEARED_EVENT,
        handlePromptCleared,
      );
    };
  }, [onInstalled]);

  if (!mode) return null;

  if (mode === 'ios') {
    return (
      <div
        data-testid="pwa-install-ios"
        className="flex min-h-550 items-start gap-150 border-t border-border-subtle py-200 text-text-subtle"
      >
        <Share aria-hidden="true" className="mt-25 size-250 shrink-0" />
        <div className="flex flex-col gap-50">
          <span className="font-designer-14m text-text-default">
            홈 화면에 추가
          </span>
          <span className="font-designer-13r">
            Safari 공유 버튼을 누른 뒤 홈 화면에 추가를 선택하세요.
          </span>
        </div>
      </div>
    );
  }

  return (
    <TextActionButton
      data-testid="pwa-install-button"
      icon={<Download aria-hidden="true" className="size-250 shrink-0" />}
      className="w-full justify-start gap-150 rounded-none border-0 border-t border-border-subtle px-0 py-200 text-left text-text-default"
      onClick={async () => {
        if (!deferredPrompt) return;
        try {
          await deferredPrompt.prompt();
          await deferredPrompt.userChoice;
        } catch (error) {
          console.error('[PWA] 설치 안내를 완료하지 못했습니다.', error);
        } finally {
          clearStoredPwaInstallPrompt();
        }
      }}
    >
      앱으로 설치
    </TextActionButton>
  );
}
