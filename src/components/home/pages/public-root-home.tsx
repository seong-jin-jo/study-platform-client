'use client';

import PublicHomeFeed from '@/components/home/pages/public-home-feed';
import HomeFeed from '@/components/retention/home-feed';
import { isAuthenticatedMemberSessionState } from '@/features/auth/model/auth-session';
import { useAuthReady } from '@/features/auth/model/use-auth';

export default function PublicRootHome() {
  const { isHydrated, sessionState } = useAuthReady();

  if (!isHydrated || !isAuthenticatedMemberSessionState(sessionState)) {
    return <PublicHomeFeed />;
  }

  return <HomeFeed />;
}
