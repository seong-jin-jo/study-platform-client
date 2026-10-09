import { Metadata } from 'next';
import { Footer } from '@/components/common/layout/footer';
import MyPageMobileNav from '@/components/common/layout/sidebar/my-page-mobile-nav';
import Sidebar from '@/components/common/layout/sidebar/my-page-sidebar';
import { requireAuthenticatedMemberRoute } from '@/features/auth/model/server-route-guard';

export const metadata: Metadata = {
  title: '마이페이지',
  description: 'ZERO-ONE 마이페이지',
};

export default async function MyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedMemberRoute();

  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-page flex-1 flex-col lg:flex-row">
        {/* 모바일 상단 탭 네비게이션 */}
        <MyPageMobileNav />
        {/* 데스크톱 사이드바 */}
        <Sidebar />
        <div className="min-w-0 flex-1 px-400 pt-400 pb-[100px] lg:px-400 lg:pt-500">
          <div className="w-full">{children}</div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
