import '../global.css';

import { GoogleTagManager } from '@next/third-parties/google';
import type { Metadata } from 'next';
import type React from 'react';
import { Suspense } from 'react';
import { GlobalOnboardingGate } from '@/components/auth/modals/onboarding-modal/global-onboarding-gate';
import ClarityScript from '@/components/common/analytics/clarity-script';
import { GoogleAnalyticsCookieSafe } from '@/components/common/analytics/google-analytics-cookie-safe';
import PageViewTracker from '@/components/common/analytics/page-view-tracker';
import Header from '@/components/common/layout/home-header';
import MobileTabBar from '@/components/common/layout/mobile-tab-bar';
import SentryInit from '@/components/common/sentry-init';
import { ServiceFloatingClassActionButtons } from '@/components/common/ui/floating-class-action-buttons';
import GlobalToast from '@/components/common/ui/global-toast';
import { createAuthHydrationSession } from '@/features/auth/model/auth-hydration-session';
import { readServerAuthSession } from '@/features/auth/model/server-auth-session';
import MainProvider from '@/providers';

export const metadata: Metadata = {
  title: 'ZERO-ONE',
  description: '매일 아침을 함께 시작하는 1:1 기상 스터디 플랫폼, ZERO-ONE',
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default async function ServiceLayout({
  children,
  profileModal,
}: Readonly<{
  children: React.ReactNode;
  profileModal?: React.ReactNode;
}>) {
  const initialSession = await readServerAuthSession();
  const initialHydrationSession = createAuthHydrationSession(initialSession);

  return (
    <>
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <ClarityScript />
      {GA_MEASUREMENT_ID && (
        <GoogleAnalyticsCookieSafe gaId={GA_MEASUREMENT_ID} />
      )}
      <SentryInit />
      <MainProvider initialSession={initialHydrationSession}>
        <GlobalToast />
        <PageViewTracker />
        <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
          <Header />
          <main
            className="mobile-floating-clearance pb-tabbar w-full flex-1"
            data-testid="service-content-root"
          >
            {children}
          </main>
          <Suspense fallback={null}>
            <ServiceFloatingClassActionButtons />
          </Suspense>
        </div>
        <MobileTabBar />
        <GlobalOnboardingGate />
        {profileModal}
      </MainProvider>
    </>
  );
}
