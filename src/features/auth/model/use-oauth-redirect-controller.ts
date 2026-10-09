'use client';

import { sendGTMEvent } from '@next/third-parties/google';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { recordAttribution } from '@/api/endpoints/marketing/attribution';
import {
  type NewMemberOAuthRedirectResult,
  OAUTH_REDIRECT_RESULT_KINDS,
  type OAuthRedirectFailureResult,
  type OAuthRedirectResult,
} from '@/types/auth/domain';
import { setAnalyticsUserId } from '@/utils/analytics-identity';
import { getAttributionParams } from '@/utils/attribution-tracker';
import { hashValue } from '@/utils/hash';
import { AUTH_EVENT_LEVELS, logAuthEvent } from './auth-debug-log';
import { AUTH_ROUTE_PATHS } from './auth-route';
import {
  clearClientAuthStateAndRedirect,
  resetClientDerivedAuthStateWithQueryCache,
} from './client-auth-cleanup';
import {
  writeExistingMemberSession,
  writeNewMemberSession,
} from './client-auth-session';
import { consumeOAuthCallbackPath } from './oauth-callback';
import { OAUTH_REDIRECT_LOG_MESSAGES } from './oauth-redirect-contract';
import {
  getOAuthRedirectParamSnapshot,
  OAuthRedirectContractError,
  parseOAuthRedirectResult,
} from './parse-oauth-redirect-result';

interface SearchParamsLike {
  // URLSearchParams.get 계약과 맞추기 위해 null을 그대로 허용한다.
  // eslint-disable-next-line @rushstack/no-new-null
  get(name: string): string | null;
}

const isDebugLoggingEnabled = process.env.NODE_ENV !== 'production';

const logOAuthRedirectError = (
  message: string,
  payload: Record<string, unknown>,
): void => {
  logAuthEvent({
    level: AUTH_EVENT_LEVELS.ERROR,
    layer: 'client-oauth-redirect',
    message,
  });

  if (!isDebugLoggingEnabled) {
    return;
  }

  console.error(message, payload);
};

const isOAuthRedirectFailure = (
  redirectResult: OAuthRedirectResult,
): redirectResult is OAuthRedirectFailureResult =>
  redirectResult.kind === OAUTH_REDIRECT_RESULT_KINDS.FAILURE;

const isOAuthRedirectNewMemberSuccess = (
  redirectResult: OAuthRedirectResult,
): redirectResult is NewMemberOAuthRedirectResult =>
  redirectResult.kind === OAUTH_REDIRECT_RESULT_KINDS.NEW_MEMBER_SUCCESS;

const getClassOnboardingPath = (
  redirectResult: NewMemberOAuthRedirectResult,
): string => {
  const searchParams = new URLSearchParams({ onboarding: 'true' });

  if (redirectResult.phoneVerificationRequired) {
    searchParams.set('phone-verification-required', 'true');
  }

  return `/class?${searchParams.toString()}`;
};

const replaceWithClearedLoginSession = (): void => {
  clearClientAuthStateAndRedirect(AUTH_ROUTE_PATHS.LOGIN);
};

export const useOAuthRedirectController = (
  searchParams: SearchParamsLike,
): void => {
  const router = useRouter();
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (hasHandledRef.current) {
      return;
    }

    hasHandledRef.current = true;

    try {
      const redirectResult = parseOAuthRedirectResult(searchParams);

      if (isOAuthRedirectFailure(redirectResult)) {
        logOAuthRedirectError(OAUTH_REDIRECT_LOG_MESSAGES.LOGIN_FAILED, {
          snapshot: getOAuthRedirectParamSnapshot(searchParams),
        });
        replaceWithClearedLoginSession();

        return;
      }

      if (isOAuthRedirectNewMemberSuccess(redirectResult)) {
        resetClientDerivedAuthStateWithQueryCache();
        writeNewMemberSession({
          accessToken: redirectResult.accessToken,
          profileImageUrl: redirectResult.profileImageUrl,
        });
        // 유입경로를 우리 DB 에 남긴다. 첫 값만 저장되므로 여러 번 불려도 안전하다.
        // 응답을 기다리지 않는다. 이 요청 때문에 온보딩 진입이 늦어지면 안 된다.
        recordAttribution().catch(() => false);
        router.replace(getClassOnboardingPath(redirectResult));
        router.refresh();

        return;
      }

      resetClientDerivedAuthStateWithQueryCache();
      const hasSavedExistingMemberSession = writeExistingMemberSession({
        accessToken: redirectResult.accessToken,
        memberId: redirectResult.memberId,
      });

      if (!hasSavedExistingMemberSession) {
        logOAuthRedirectError(OAUTH_REDIRECT_LOG_MESSAGES.CONTRACT_MISMATCH, {
          message: '기존 회원 세션 저장에 실패했습니다.',
          snapshot: getOAuthRedirectParamSnapshot(searchParams),
        });
        replaceWithClearedLoginSession();

        return;
      }

      sendGTMEvent({
        event: 'custom_member_login',
        dl_timestamp: new Date().toISOString(),
        dl_member_id: hashValue(redirectResult.memberId),
        dl_login_method: redirectResult.authVendor ?? '',
        ...getAttributionParams(),
      });

      // 방문 분석에 회원번호를 붙인다. 폰과 노트북이 한 사람으로 묶인다.
      setAnalyticsUserId(redirectResult.memberId);
      // 기존 회원도 부른다. 첫 유입이 이미 있으면 서버가 무시한다.
      // 지금 가입돼 있는 158명은 이 경로로만 출처가 채워진다.
      recordAttribution().catch(() => false);
      router.replace(consumeOAuthCallbackPath());
      router.refresh();
    } catch (error) {
      if (error instanceof OAuthRedirectContractError) {
        logOAuthRedirectError(OAUTH_REDIRECT_LOG_MESSAGES.CONTRACT_MISMATCH, {
          message: error.message,
          reasons: error.reasons,
          snapshot: error.snapshot,
        });
      } else {
        logOAuthRedirectError(OAUTH_REDIRECT_LOG_MESSAGES.UNEXPECTED_ERROR, {
          error,
          snapshot: getOAuthRedirectParamSnapshot(searchParams),
        });
      }

      replaceWithClearedLoginSession();
    }
  }, [router, searchParams]);
};
