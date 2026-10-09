'use client';

import { useEffect } from 'react';

import { PWA_CACHE_VERSION, PWA_SERVICE_WORKER_ENABLED } from '@/config/pwa';
import { APP_BUILD_METADATA } from '@/lib/app-build-metadata';
import {
  isStandaloneDisplayMode,
  shouldRegisterPwaServiceWorker,
} from '@/utils/pwa';
import {
  getPwaReloadAction,
  hasNewAppCommit,
  PWA_RELOAD_GUARD_KEY,
  PWA_SKIP_WAITING_MESSAGE,
  shouldCheckPwaVersion,
} from '@/utils/pwa-update';

interface VersionResponse {
  commit?: unknown;
}

const serviceWorkerUrl = (version: string) =>
  `/sw.js?v=${encodeURIComponent(version)}`;

function requestServiceWorkerActivation(
  registration: ServiceWorkerRegistration,
) {
  const postSkipWaiting = (worker: ServiceWorker) => {
    worker.postMessage({ type: PWA_SKIP_WAITING_MESSAGE });
  };

  if (registration.waiting) {
    postSkipWaiting(registration.waiting);
    return true;
  }

  const installing = registration.installing;
  if (!installing) return false;

  if (installing.state === 'installed') {
    postSkipWaiting(installing);
    return true;
  }

  const handleStateChange = () => {
    if (installing.state === 'installed') {
      installing.removeEventListener('statechange', handleStateChange);
      postSkipWaiting(installing);
    } else if (installing.state === 'redundant') {
      installing.removeEventListener('statechange', handleStateChange);
    }
  };
  installing.addEventListener('statechange', handleStateChange);
  return true;
}

export default function PwaRuntime() {
  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');

    const syncDisplayMode = () => {
      document.documentElement.dataset.pwaDisplayMode =
        isStandaloneDisplayMode() ? 'standalone' : 'browser';
    };

    syncDisplayMode();
    displayMode.addEventListener('change', syncDisplayMode);

    if (
      shouldRegisterPwaServiceWorker({
        nodeEnv: process.env.NODE_ENV,
        enabled: PWA_SERVICE_WORKER_ENABLED,
        hasServiceWorker: 'serviceWorker' in navigator,
      })
    ) {
      const runtime = {
        controllerChanged: false,
        disposed: false,
        lastCheckedAt: undefined as number | undefined,
        pendingCommit: undefined as string | undefined,
        registration: undefined as ServiceWorkerRegistration | undefined,
      };

      const attemptReload = () => {
        if (!runtime.controllerChanged || !runtime.pendingCommit) return false;

        const action = getPwaReloadAction({
          activeElement: document.activeElement ?? undefined,
          guardedCommit:
            sessionStorage.getItem(PWA_RELOAD_GUARD_KEY) ?? undefined,
          targetCommit: runtime.pendingCommit,
        });
        if (action !== 'reload') return false;

        sessionStorage.setItem(PWA_RELOAD_GUARD_KEY, runtime.pendingCommit);
        window.location.reload();
        return true;
      };

      const handleControllerChange = () => {
        runtime.controllerChanged = true;
        attemptReload();
      };

      const updateServiceWorker = async (deployedCommit: string) => {
        const currentRegistration = runtime.registration;
        if (!currentRegistration) return;

        runtime.pendingCommit = deployedCommit;
        runtime.controllerChanged = false;
        await currentRegistration.update();
        if (requestServiceWorkerActivation(currentRegistration)) return;

        // The existing registration URL contains the previous build version.
        // Re-register the same worker path with the deployed commit so its cache
        // namespace can advance even when sw.js source bytes did not change.
        const versionedRegistration = await navigator.serviceWorker.register(
          serviceWorkerUrl(deployedCommit),
          { scope: '/' },
        );
        await versionedRegistration.update();
        requestServiceWorkerActivation(versionedRegistration);
      };

      const checkVersion = async (force = false) => {
        const now = Date.now();
        if (
          !force &&
          !shouldCheckPwaVersion({
            lastCheckedAt: runtime.lastCheckedAt,
            now,
            visibilityState: document.visibilityState,
          })
        ) {
          return;
        }

        runtime.lastCheckedAt = now;
        try {
          const response = await fetch('/version.json', {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          if (!response.ok) return;

          const payload = (await response.json()) as VersionResponse;
          const deployedCommit =
            typeof payload.commit === 'string' ? payload.commit.trim() : '';
          if (
            !hasNewAppCommit(APP_BUILD_METADATA.commit, deployedCommit) ||
            sessionStorage.getItem(PWA_RELOAD_GUARD_KEY) === deployedCommit
          ) {
            return;
          }

          await updateServiceWorker(deployedCommit);
        } catch (error: unknown) {
          console.warn('[PWA] 새 버전 확인에 실패했습니다.', error);
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState !== 'visible') return;
        if (attemptReload()) return;
        checkVersion().catch(() => undefined);
      };

      const register = async () => {
        try {
          runtime.registration = await navigator.serviceWorker.register(
            serviceWorkerUrl(PWA_CACHE_VERSION),
            { scope: '/' },
          );
          if (!runtime.disposed) await checkVersion(true);
        } catch (error: unknown) {
          console.error('[PWA] 서비스워커 등록에 실패했습니다.', error);
        }
      };

      navigator.serviceWorker.addEventListener(
        'controllerchange',
        handleControllerChange,
      );
      document.addEventListener('visibilitychange', handleVisibilityChange);

      if (document.readyState === 'complete') {
        register().catch(() => undefined);
      } else window.addEventListener('load', register, { once: true });

      return () => {
        runtime.disposed = true;
        displayMode.removeEventListener('change', syncDisplayMode);
        window.removeEventListener('load', register);
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
        navigator.serviceWorker.removeEventListener(
          'controllerchange',
          handleControllerChange,
        );
      };
    }

    return () => displayMode.removeEventListener('change', syncDisplayMode);
  }, []);

  return null;
}
