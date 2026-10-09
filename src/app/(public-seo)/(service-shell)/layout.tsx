import { Suspense } from 'react';
import { GlobalOnboardingGate } from '@/components/auth/modals/onboarding-modal/global-onboarding-gate';
import { Footer } from '@/components/common/layout/footer';
import MobileTabBar from '@/components/common/layout/mobile-tab-bar';
import PublicHomeHeader from '@/components/common/layout/public-home-header';
import SentryInit from '@/components/common/sentry-init';
import { ServiceFloatingClassActionButtons } from '@/components/common/ui/floating-class-action-buttons';

export default function PublicServiceShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SentryInit />
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <PublicHomeHeader />
        <main
          className="pb-tabbar w-full flex-1"
          data-testid="service-content-root"
        >
          {children}
        </main>
        <Footer />
        <Suspense fallback={null}>
          <ServiceFloatingClassActionButtons />
        </Suspense>
      </div>
      <MobileTabBar />
      <GlobalOnboardingGate />
    </>
  );
}
