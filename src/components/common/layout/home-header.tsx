import Image from 'next/image';
import Link from 'next/link';
import {
  SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS,
  tryGetMyClassOnboardingStatusInServer,
} from '@/api/endpoints/class-onboarding/get-my-class-onboarding-status.server';
import {
  SERVER_USER_PROFILE_RESULT_KINDS,
  tryGetUserProfileInServer,
} from '@/api/endpoints/user/get-user-profile.server';
import HomeHeaderClient from '@/components/common/layout/home-header-client';
import { isAuthenticatedMemberSessionState } from '@/features/auth/model/auth-session';
import { readServerAuthSession } from '@/features/auth/model/server-auth-session';
import { isClassOnboardingCompleted } from '@/utils/class-onboarding-status';

export default async function Header() {
  const { sessionState, authenticatedMemberId: memberId } =
    await readServerAuthSession();
  const isLoggedIn = isAuthenticatedMemberSessionState(sessionState);

  let userProfile = null;
  let initialOnboardingCompleted = false;

  if (isLoggedIn && memberId) {
    const [profileResult, onboardingStatusResult] = await Promise.all([
      tryGetUserProfileInServer(memberId),
      tryGetMyClassOnboardingStatusInServer(),
    ]);

    if (profileResult.kind === SERVER_USER_PROFILE_RESULT_KINDS.SUCCESS) {
      userProfile = profileResult.profile;
    } else if (
      profileResult.kind !== SERVER_USER_PROFILE_RESULT_KINDS.MISSING_PROFILE
    ) {
      console.error(
        `[Header] Failed to fetch user profile for memberId=${memberId}`,
        profileResult.error,
      );
    }

    if (
      onboardingStatusResult.kind ===
      SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.SUCCESS
    ) {
      initialOnboardingCompleted = isClassOnboardingCompleted(
        onboardingStatusResult.status,
      );
    } else if (
      onboardingStatusResult.kind !==
      SERVER_CLASS_ONBOARDING_STATUS_RESULT_KINDS.NOT_FOUND
    ) {
      console.error(
        `[Header] Failed to fetch class onboarding status for memberId=${memberId}`,
        onboardingStatusResult.error,
      );
    }
  }

  const userInfo = userProfile?.memberProfile;
  const userImg = userProfile
    ? userInfo?.profileImage?.resizedImages[0].resizedImageUrl
    : undefined;
  const initialNickname = userInfo?.nickname ?? undefined;
  const initialLevelName = userProfile?.sincerityTemp?.levelName ?? undefined;

  return (
    <header className="app-shell-header sticky top-0 z-10 w-full border-b border-border-subtle bg-background-default max-md:h-700 md:relative md:h-800 md:border-b-0 md:py-0 md:mix-blend-multiply xl:h-auto xl:py-125">
      <div className="app-shell-safe-x mx-auto flex h-full w-full max-w-page items-center justify-between md:px-200 lg:px-300 xl:px-600">
        <div className="flex shrink-0 items-center gap-100 md:h-full md:px-0 md:py-0 xl:h-auto xl:px-100 xl:py-125">
          <Image src="/icons/logo.svg" alt="Logo" width={18} height={18} />
          <Link
            href="/"
            className="inline-flex min-h-550 items-center"
            aria-label="홈"
          >
            <Image
              src="/icons/logo_title.svg"
              alt="Logo-title"
              width={106}
              height={11}
            />
          </Link>
          <span className="rounded-full border-[0.5px] border-border-default px-75 py-25 text-center font-designer-12m leading-normal font-medium">
            BETA
          </span>
        </div>

        <HomeHeaderClient
          initialSessionState={sessionState}
          initialAuthenticatedMemberId={memberId}
          initialUserImg={userImg}
          initialNickname={initialNickname}
          initialLevelName={initialLevelName}
          initialOnboardingCompleted={initialOnboardingCompleted}
        />
      </div>
    </header>
  );
}
