import { GlobalOnboardingGate } from '@/components/auth/modals/onboarding-modal/global-onboarding-gate';
import { Footer } from '@/components/common/layout/footer';
import MobileTabBar from '@/components/common/layout/mobile-tab-bar';
import PublicHomeHeader from '@/components/common/layout/public-home-header';
import { JsonLd } from '@/components/common/seo/json-ld';
import FloatingClassActionButtons from '@/components/common/ui/floating-class-action-buttons';
import { getOrganizationSchema, getWebsiteSchema } from '@/utils/seo';

export default function PublicLandingShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const organizationSchema = getOrganizationSchema();
  const websiteSchema = getWebsiteSchema();

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <div className="min-h-screen w-full">
        <div className="mx-auto flex min-h-screen w-full flex-col items-center">
          <PublicHomeHeader />
          <main className="pb-tabbar w-full flex-1">{children}</main>
        </div>
      </div>
      <Footer />
      <FloatingClassActionButtons />
      <MobileTabBar />
      <GlobalOnboardingGate />
    </>
  );
}
