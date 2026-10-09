import { redirect } from 'next/navigation';
import {
  AUTH_ROUTE_PATHS,
  getClearSessionRedirectUrl,
} from '@/features/auth/model/auth-route';
import { AUTH_ROLE_IDS } from '@/types/auth/domain';
import {
  isAnonymousSessionState,
  isPendingSignupSessionState,
} from './auth-session';
import {
  readServerAuthSession,
  type DecodedServerToken,
} from './server-auth-session';

interface RequireAuthenticatedMemberRouteOptions {
  anonymousRedirectTo?: string;
  invalidSessionRedirectTo?: string;
  pendingSignupRedirectTo?: string;
}

interface RequireAdminRouteOptions
  extends RequireAuthenticatedMemberRouteOptions {
  unauthorizedRedirectTo?: string;
}

interface AuthenticatedMemberRouteContext {
  accessToken: string;
  decodedToken: DecodedServerToken;
  memberId: number;
}

const redirectToClearedSession = (redirectTo: string): never => {
  redirect(getClearSessionRedirectUrl(redirectTo));
};

export const requireAuthenticatedMemberRoute = async ({
  anonymousRedirectTo = AUTH_ROUTE_PATHS.LANDING,
  invalidSessionRedirectTo = AUTH_ROUTE_PATHS.LOGIN,
  // 미가입(guest) 세션은 레거시 /sign-up 모달이 아니라 신규 온보딩으로 보낸다.
  pendingSignupRedirectTo = AUTH_ROUTE_PATHS.CLASS_ONBOARDING,
}: RequireAuthenticatedMemberRouteOptions = {}): Promise<AuthenticatedMemberRouteContext> => {
  const { accessToken, sessionState, decodedToken, authenticatedMemberId } =
    await readServerAuthSession();

  if (isAnonymousSessionState(sessionState)) {
    redirect(anonymousRedirectTo);
  }

  if (isPendingSignupSessionState(sessionState)) {
    redirect(pendingSignupRedirectTo);
  }

  if (!accessToken || !authenticatedMemberId || !decodedToken) {
    redirectToClearedSession(invalidSessionRedirectTo);
  }

  return {
    accessToken: accessToken as string,
    decodedToken: decodedToken as DecodedServerToken,
    memberId: authenticatedMemberId as number,
  };
};

export const requireAdminRoute = async ({
  anonymousRedirectTo = AUTH_ROUTE_PATHS.LANDING,
  invalidSessionRedirectTo = AUTH_ROUTE_PATHS.LOGIN,
  pendingSignupRedirectTo = AUTH_ROUTE_PATHS.CLASS_ONBOARDING,
  unauthorizedRedirectTo = AUTH_ROUTE_PATHS.LANDING,
}: RequireAdminRouteOptions = {}): Promise<AuthenticatedMemberRouteContext> => {
  const session = await requireAuthenticatedMemberRoute({
    anonymousRedirectTo,
    invalidSessionRedirectTo,
    pendingSignupRedirectTo,
  });

  if (!session.decodedToken.roleIds?.includes(AUTH_ROLE_IDS.ADMIN)) {
    redirect(unauthorizedRedirectTo);
  }

  return session;
};
