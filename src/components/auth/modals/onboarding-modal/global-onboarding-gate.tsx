'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { isAuthenticatedMemberSessionState } from '@/features/auth/model/auth-session';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { useClassOnboardingStatusQuery } from '@/hooks/queries/class-onboarding/use-class-onboarding';
import { useOnboardingStore } from '@/stores/use-onboarding-store';
import { isClassOnboardingCompleted } from '@/utils/class-onboarding-status';
import { OnboardingModal } from './onboarding-modal';

export function GlobalOnboardingGate() {
  const searchParams = useSearchParams();
  const { isHydrated, memberId, sessionState } = useAuthReady();
  const hasOnboardingStoreHydrated = useOnboardingStore(
    (state) => state.hasHydrated,
  );
  const isOpen = useOnboardingStore((state) => state.isOpen);
  const isDismissedUntilReload = useOnboardingStore(
    (state) => state.isDismissedUntilReload,
  );
  const openOnboarding = useOnboardingStore((state) => state.open);
  const isExplicitOnboardingRedirect =
    searchParams.get('onboarding') === 'true';
  const shouldCheckOnboarding =
    isHydrated &&
    Boolean(memberId) &&
    isAuthenticatedMemberSessionState(sessionState);
  const {
    data: status,
    isError,
    isLoading,
  } = useClassOnboardingStatusQuery(shouldCheckOnboarding);
  const isCompleted = isClassOnboardingCompleted(status);

  useEffect(() => {
    if (
      !shouldCheckOnboarding ||
      !status ||
      isLoading ||
      isError ||
      isCompleted ||
      !hasOnboardingStoreHydrated ||
      isExplicitOnboardingRedirect ||
      isDismissedUntilReload ||
      isOpen
    ) {
      return;
    }

    openOnboarding();
  }, [
    isCompleted,
    isDismissedUntilReload,
    isError,
    isExplicitOnboardingRedirect,
    hasOnboardingStoreHydrated,
    isLoading,
    isOpen,
    openOnboarding,
    shouldCheckOnboarding,
    status,
  ]);

  return <OnboardingModal />;
}
