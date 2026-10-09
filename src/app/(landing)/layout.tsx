import '../global.css';

import { GoogleTagManager } from '@next/third-parties/google';
import type { Metadata } from 'next';
import { GlobalOnboardingGate } from '@/components/auth/modals/onboarding-modal/global-onboarding-gate';
import ClarityScript from '@/components/common/analytics/clarity-script';
import { GoogleAnalyticsCookieSafe } from '@/components/common/analytics/google-analytics-cookie-safe';
import PageViewTracker from '@/components/common/analytics/page-view-tracker';
import { Footer } from '@/components/common/layout/footer';
import Header from '@/components/common/layout/home-header';
import MobileTabBar from '@/components/common/layout/mobile-tab-bar';
import { JsonLd } from '@/components/common/seo/json-ld';
import FloatingClassActionButtons from '@/components/common/ui/floating-class-action-buttons';
import GlobalToast from '@/components/common/ui/global-toast';
import { createAuthHydrationSession } from '@/features/auth/model/auth-hydration-session';
import { readServerAuthSession } from '@/features/auth/model/server-auth-session';
import MainProvider from '@/providers';
import { getOrganizationSchema, getWebsiteSchema } from '@/utils/seo';

export const metadata: Metadata = {
  title: 'ZERO ONE IT',
  description: '코딩 몰라도 OK. 따라만 하면 나도 AI 시대의 경쟁력 UP!',
  keywords: [
    '바이브코딩',
    '노베이스 코딩',
    'AI 개발',
    '비개발자',
    '클로드 코드',
    '입문 강의',
  ],
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://www.zeroone.it.kr',
    siteName: 'ZERO ONE IT',
    title: 'ZERO ONE IT | Built by people who started at zero.',
    description: '코딩 몰라도 OK. 따라만 하면 나도 AI 시대의 경쟁력 UP!',
    images: [
      {
        url: 'https://www.zeroone.it.kr/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ZERO ONE IT',
      },
    ],
  },
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default async function LandingPageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSession = await readServerAuthSession();
  const initialHydrationSession = createAuthHydrationSession(initialSession);
  const organizationSchema = getOrganizationSchema();
  const websiteSchema = getWebsiteSchema();

  return (
    <>
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <ClarityScript />
      {GA_MEASUREMENT_ID && (
        <GoogleAnalyticsCookieSafe gaId={GA_MEASUREMENT_ID} />
      )}
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <MainProvider initialSession={initialHydrationSession}>
        <PageViewTracker />
        <div className="min-h-screen w-full">
          <div className="mx-auto flex min-h-screen w-full flex-col items-center">
            <Header />
            <main className="pb-tabbar w-full flex-1">{children}</main>
          </div>
        </div>
        <Footer />
        <GlobalToast />
        <FloatingClassActionButtons />
        <MobileTabBar />
        <GlobalOnboardingGate />
      </MainProvider>
    </>
  );
}
