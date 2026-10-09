import { APP_BUILD_VALUE_UNAVAILABLE } from '@/lib/app-build-metadata';

export const PWA_VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const PWA_RELOAD_GUARD_KEY = 'zeroone:pwa-reloaded-commit';
export const PWA_SKIP_WAITING_MESSAGE = 'SKIP_WAITING';

interface ActiveElementLike {
  readonly isContentEditable?: boolean;
  readonly tagName?: string;
}

const normalizeCommit = (commit: string | undefined) => commit?.trim();

export function hasNewAppCommit(
  currentCommit: string | undefined,
  deployedCommit: string | undefined,
) {
  const current = normalizeCommit(currentCommit);
  const deployed = normalizeCommit(deployedCommit);

  if (
    !current ||
    !deployed ||
    current === APP_BUILD_VALUE_UNAVAILABLE ||
    deployed === APP_BUILD_VALUE_UNAVAILABLE
  ) {
    return false;
  }

  return current !== deployed;
}

export function isPwaTextEntryActive(
  activeElement: ActiveElementLike | undefined,
) {
  const tagName = activeElement?.tagName?.toUpperCase();
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    activeElement?.isContentEditable === true
  );
}

export function getPwaReloadAction({
  activeElement,
  guardedCommit,
  targetCommit,
}: {
  activeElement: ActiveElementLike | undefined;
  guardedCommit: string | undefined;
  targetCommit: string | undefined;
}): 'defer' | 'none' | 'reload' {
  const target = normalizeCommit(targetCommit);
  if (!target || normalizeCommit(guardedCommit) === target) return 'none';
  if (isPwaTextEntryActive(activeElement)) return 'defer';
  return 'reload';
}

export function shouldCheckPwaVersion({
  lastCheckedAt,
  now,
  visibilityState,
}: {
  lastCheckedAt: number | undefined;
  now: number;
  visibilityState: DocumentVisibilityState;
}) {
  if (visibilityState !== 'visible') return false;
  if (lastCheckedAt === undefined) return true;
  return now - lastCheckedAt >= PWA_VERSION_CHECK_INTERVAL_MS;
}
