import {
  CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES,
  refreshClientAuthSession,
} from '@/api/client/auth-session-refresh';
import { getCookie } from '@/api/client/cookie';
import { AUTH_COOKIE_NAMES } from '@/features/auth/model/auth-cookie';
import {
  hasClientSessionConfirmedAnonymous,
  markClientSessionConfirmedAnonymous,
} from '@/features/auth/model/client-auth-session';

export const PUBLIC_AUTH_BOOTSTRAP_STATES = {
  PENDING: 'pending',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
  DEGRADED: 'degraded',
} as const;

export type PublicAuthBootstrapState =
  (typeof PUBLIC_AUTH_BOOTSTRAP_STATES)[keyof typeof PUBLIC_AUTH_BOOTSTRAP_STATES];

interface RefreshResult {
  state: string;
}

export const createSingleFlightPublicAuthBootstrap = (
  readAccessToken: () => string | undefined,
  refresh: () => Promise<RefreshResult>,
  // accessToken 쿠키(1시간 만료)가 없다고 곧바로 익명은 아니다. refresh_token 은
  // httpOnly 라 여기서 못 읽는다. shouldSkipRefreshProbe 는 "refresh 를 이미
  // 한 번 쳐봤고 결과가 확실히 무효였다"가 확정됐을 때만 true 를 반환해야
  // 한다. 그 확정이 없는 모든 경우(마커 없음 = 배포 직후 기존 사용자일 수도
  // 있는 "모름", storage 접근 실패 등)는 반드시 false 로 취급해 refresh 를
  // 쳐본다. 잘못 쳐도 조용히 익명 처리될 뿐이지만, 잘못 건너뛰면 로그인
  // 중이던 사용자가 로그아웃되는 비대칭이 있기 때문이다.
  // 기본값 false 는 이 신호가 없는 호출부(테스트 등)에서 항상 프로브를
  // 치는 기존 동작을 유지하기 위함이다.
  shouldSkipRefreshProbe: () => boolean = () => false,
  // refresh 결과가 확정적으로 무효(INVALID)였을 때만 호출된다. 이후 방문부터
  // shouldSkipRefreshProbe 가 true 를 반환해 같은 방문자에게 반복 400 이
  // 뜨는 것을 막는다. 기본값은 no-op(테스트 등에서 마커링이 필요 없을 때).
  markConfirmedAnonymous: () => void = () => {},
) => {
  let documentBootstrapPromise: Promise<PublicAuthBootstrapState> | undefined;

  const run = async (): Promise<PublicAuthBootstrapState> => {
    if (readAccessToken()) return PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED;

    if (shouldSkipRefreshProbe()) {
      return PUBLIC_AUTH_BOOTSTRAP_STATES.ANONYMOUS;
    }

    const result = await refresh();
    if (result.state === CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.SUCCESS) {
      return PUBLIC_AUTH_BOOTSTRAP_STATES.AUTHENTICATED;
    }
    if (result.state === CLIENT_AUTH_SESSION_REFRESH_RESULT_STATES.INVALID) {
      markConfirmedAnonymous();
      return PUBLIC_AUTH_BOOTSTRAP_STATES.ANONYMOUS;
    }
    return PUBLIC_AUTH_BOOTSTRAP_STATES.DEGRADED;
  };

  return () => {
    documentBootstrapPromise ??= run();
    return documentBootstrapPromise;
  };
};

const readBrowserAccessToken = () =>
  getCookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN) || undefined;

export const getPublicDocumentAuthBootstrap =
  createSingleFlightPublicAuthBootstrap(
    readBrowserAccessToken,
    refreshClientAuthSession,
    hasClientSessionConfirmedAnonymous,
    markClientSessionConfirmedAnonymous,
  );

export const hasReadableBrowserAccessToken = () =>
  Boolean(readBrowserAccessToken());
