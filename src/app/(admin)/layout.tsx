import '../global.css';

import { GoogleTagManager } from '@next/third-parties/google';
import type { Metadata } from 'next';
import ClarityScript from '@/components/common/analytics/clarity-script';
import { GoogleAnalyticsCookieSafe } from '@/components/common/analytics/google-analytics-cookie-safe';
import PageViewTracker from '@/components/common/analytics/page-view-tracker';
import AdminSideBar from '@/components/common/layout/sidebar/admin-sidebar';
import GlobalToast from '@/components/common/ui/global-toast';
import { requireAdminRoute } from '@/features/auth/model/server-route-guard';
import MainProvider from '@/providers';

export const metadata: Metadata = {
  title: '관리자 - ZERO-ONE',
  description: 'ZERO-ONE 플랫폼 관리자 영역',
  robots: {
    index: false,
    follow: false,
  },
};

// 관리자 영역 전체는 세션(쿠키) 기반 인증 가드(requireAdminRoute)에 의존하므로
// 정적 생성 대상이 아니다. 정적 프리렌더로 not-found(404)가 굳어 빌드/배포 캐시에
// 잔존하면 어드민 페이지가 404로 막히므로(예: 매출관리), 세그먼트 전체를 동적 렌더링으로 고정한다.
export const dynamic = 'force-dynamic';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { accessToken } = await requireAdminRoute();
  const initialSession = {
    accessToken,
  };

  return (
    <>
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <ClarityScript />
      {GA_MEASUREMENT_ID && (
        <GoogleAnalyticsCookieSafe gaId={GA_MEASUREMENT_ID} />
      )}
      <MainProvider initialSession={initialSession}>
        <PageViewTracker />
        <div className="isolate flex min-w-[1200px] items-start overflow-x-hidden">
          <div className="sticky top-0 z-20 shrink-0 self-start">
            <AdminSideBar />
          </div>
          <main className="w-0 min-w-0 flex-1 overflow-x-hidden p-300">
            {children}
          </main>
        </div>
        <GlobalToast />
      </MainProvider>
    </>
  );
}
