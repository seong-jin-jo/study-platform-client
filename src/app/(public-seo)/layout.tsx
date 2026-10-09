import { GoogleTagManager } from '@next/third-parties/google';
import type { Metadata } from 'next';
import ClarityScript from '@/components/common/analytics/clarity-script';
import { GoogleAnalyticsCookieSafe } from '@/components/common/analytics/google-analytics-cookie-safe';
import PageViewTracker from '@/components/common/analytics/page-view-tracker';
import GlobalToast from '@/components/common/ui/global-toast';
import { PublicAuthBootstrap } from '@/features/auth/client/public-auth-bootstrap';
import MainProvider from '@/providers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: null,
  description: null,
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function PublicSeoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <ClarityScript />
      {GA_MEASUREMENT_ID && (
        <GoogleAnalyticsCookieSafe gaId={GA_MEASUREMENT_ID} />
      )}
      <MainProvider>
        <PublicAuthBootstrap>
          <GlobalToast />
          <PageViewTracker />
          {children}
        </PublicAuthBootstrap>
      </MainProvider>
    </>
  );
}
