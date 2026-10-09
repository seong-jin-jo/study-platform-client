'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserAvatar from '@/components/common/ui/avatar';
import TabMenu from '@/components/common/ui/tab-menu';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { useUserProfileQuery } from '@/hooks/queries/user/use-user-profile-query';
import { isProduction } from '@/utils/is-production';
import OutIcon from 'public/icons/out.svg';

export default function AdminSideBar() {
  const { memberId } = useAuthReady();
  const { data: profile } = useUserProfileQuery(memberId ?? 0);
  const pathname = usePathname();
  const isSalesManagementPath = pathname.startsWith('/admin/sales-management');
  const isMentoringManagementPath = pathname.startsWith('/admin/mentoring');
  const isCourseManagementPath = pathname.startsWith('/admin/courses');
  const isAlerttalkManagementPath = pathname.startsWith('/admin/alerttalk');
  const isKoanApprovalPath = pathname.startsWith('/admin/koans');
  const isQaToolsPath = pathname.startsWith('/admin/qa-tools');
  const isQaScenariosPath = pathname.startsWith('/admin/qa-scenarios');
  const showQaTools = !isProduction();

  return (
    <aside className="border-border-subtle h-screen w-fit border-r p-200">
      <div className="border-border-subtle flex items-center gap-150 border-b py-200">
        {profile && (
          <UserAvatar
            size={40}
            image={
              profile.memberProfile?.profileImage?.resizedImages[0]
                .resizedImageUrl
            }
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="font-designer-14m text-text-default">
            {profile?.memberProfile.memberName}
          </p>
        </div>

        <Link href="/">
          <OutIcon />
        </Link>
      </div>

      <nav className="mt-200 flex min-w-0 flex-col gap-100">
        <Link className="w-full text-left" href="/admin">
          <TabMenu active={pathname === '/admin'}>사용자 관리</TabMenu>
        </Link>

        <Link className="w-full text-left" href="/admin/courses">
          <TabMenu active={isCourseManagementPath}>클래스 관리</TabMenu>
        </Link>

        <Link
          className="w-full text-left"
          href="/admin/sales-management/payment-refund"
        >
          <TabMenu active={isSalesManagementPath}>매출 관리</TabMenu>
        </Link>

        <Link className="w-full text-left" href="/admin/mentoring/dashboard">
          <TabMenu active={isMentoringManagementPath}>멘토링 관리</TabMenu>
        </Link>

        <Link className="w-full text-left" href="/admin/alerttalk/templates">
          <TabMenu active={isAlerttalkManagementPath}>알림톡 관리</TabMenu>
        </Link>

        <Link className="w-full text-left" href="/admin/koans">
          <TabMenu active={isKoanApprovalPath}>화두 통합 승인</TabMenu>
        </Link>

        {showQaTools && (
          <Link className="w-full text-left" href="/admin/qa-tools">
            <TabMenu active={isQaToolsPath}>QA 시드 도구</TabMenu>
          </Link>
        )}

        {showQaTools && (
          <Link className="w-full text-left" href="/admin/qa-scenarios">
            <TabMenu active={isQaScenariosPath}>QA 테스트 시나리오</TabMenu>
          </Link>
        )}
      </nav>
    </aside>
  );
}
