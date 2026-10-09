'use client';

import { Monitor, Plus, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import Button from '@/components/common/ui/button';
import { isAuthenticatedMemberSessionState } from '@/features/auth/model/auth-session';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { useClassOnboardingStatusQuery } from '@/hooks/queries/class-onboarding/use-class-onboarding';
import { useUserStore } from '@/stores/use-user-store';
import type { AuthSessionState } from '@/types/auth/domain';
import { isClassOnboardingCompleted } from '@/utils/class-onboarding-status';
import HeaderNav from './header-nav';
import HeaderUserDropdown from './header-user-dropdown';
import MobileMenuDrawer from './mobile-menu-drawer';

const LoginModal = dynamic(
  () => import('@/components/auth/modals/login-modal'),
);

const NotificationDropdown = dynamic(
  () => import('@/components/common/modals/notification-dropdown'),
);

interface HomeHeaderClientProps {
  initialSessionState: AuthSessionState;
  initialAuthenticatedMemberId?: number;
  initialUserImg?: string;
  initialNickname?: string;
  initialLevelName?: string;
  initialOnboardingCompleted?: boolean;
}

export default function HomeHeaderClient({
  initialSessionState,
  initialAuthenticatedMemberId,
  initialUserImg,
  initialNickname,
  initialLevelName,
  initialOnboardingCompleted = false,
}: HomeHeaderClientProps) {
  const router = useRouter();
  const {
    isHydrated,
    memberId: hydratedMemberId,
    sessionState: hydratedSessionState,
  } = useAuthReady();
  const storedMemberId = useUserStore((state) => state.memberId);
  const storedProfileImageUrl = useUserStore((state) => state.profileImageUrl);
  const storedNickname = useUserStore((state) => state.nickname);
  const initialIsLoggedIn =
    isAuthenticatedMemberSessionState(initialSessionState);
  const hydratedIsLoggedIn =
    isAuthenticatedMemberSessionState(hydratedSessionState);
  const isLoggedIn = isHydrated ? hydratedIsLoggedIn : initialIsLoggedIn;
  const currentMemberId = isHydrated
    ? hydratedMemberId
    : initialAuthenticatedMemberId;
  const shouldCheckOnboarding = isLoggedIn && Boolean(currentMemberId);
  const { data: onboardingStatus } = useClassOnboardingStatusQuery(
    shouldCheckOnboarding,
  );
  const onboardingCompleted = onboardingStatus
    ? isClassOnboardingCompleted(onboardingStatus)
    : initialOnboardingCompleted;
  const isCompletedMember = isLoggedIn && onboardingCompleted;
  const userImg =
    isCompletedMember && currentMemberId && storedMemberId === currentMemberId
      ? (storedProfileImageUrl ?? initialUserImg)
      : initialUserImg;
  const nickname =
    isCompletedMember && currentMemberId && storedMemberId === currentMemberId
      ? (storedNickname ?? initialNickname)
      : initialNickname;

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get('q') ?? '').trim();

    if (query.length < 2) {
      return;
    }

    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <div className="hidden md:flex md:min-w-0 md:flex-1 md:items-center xl:gap-200">
        <HeaderNav isLoggedIn={isCompletedMember} />

        <form
          role="search"
          className="hidden h-400 min-w-0 flex-1 items-center gap-100 rounded-2000 bg-fill-neutral-default-default px-175 xl:flex"
          onSubmit={handleSearchSubmit}
        >
          <Search
            aria-hidden="true"
            className="shrink-0 text-icon-subtlest"
            size={16}
          />
          <input
            aria-label="막힌 지점 검색"
            name="q"
            type="search"
            required
            minLength={2}
            maxLength={100}
            placeholder="막힌 지점 검색 (예: 배포 환경변수)"
            className="font-designer-13m min-w-0 flex-1 bg-transparent text-text-default outline-none placeholder:text-text-subtlest"
          />
        </form>

        <div className="ml-75 flex shrink-0 items-center gap-100 lg:ml-125 lg:gap-150 xl:ml-0 xl:gap-200">
          {isCompletedMember ? (
            <div className="hidden xl:block">
              <Button
                asChild
                color="secondary"
                size="small"
                className="shrink-0 rounded-2000 font-designer-14m"
              >
                <Link
                  href="/community/write"
                  className="flex items-center gap-50"
                >
                  <Plus aria-hidden="true" size={16} />
                  글쓰기
                </Link>
              </Button>
            </div>
          ) : null}

          {isCompletedMember ? (
            <div className="flex items-center gap-300">
              <NotificationDropdown />
              <Button asChild size="small" className="font-designer-14m">
                <Link href="/my-class" className="flex items-center gap-75">
                  마이 클래스
                  <Monitor size={16} />
                </Link>
              </Button>

              <HeaderUserDropdown
                userImg={userImg}
                nickname={nickname ?? undefined}
                levelName={initialLevelName}
              />
            </div>
          ) : (
            // isCompletedMember 가 아직 확정되지 않은 초기/익명 렌더에서도
            // 이 게스트 버튼이 기본값이다. public-seo 레이아웃(예: 홈 "/")은
            // 서버가 세션을 강제로 익명 처리하므로, 첫 페인트/노스크립트에서도
            // 항상 이 버튼이 SSR된다. 헤더 우측이 빈 상태로 보이던 문제(2026-08-25)를 수정했다.
            <LoginModal
              openTrigger={
                <Button
                  size="small"
                  className="rounded-2000 font-designer-14m whitespace-nowrap"
                >
                  로그인 / 회원가입
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-100 md:hidden">
        {isCompletedMember ? <NotificationDropdown /> : null}
        <MobileMenuDrawer isLoggedIn={isCompletedMember} userImg={userImg} />
      </div>
    </>
  );
}
