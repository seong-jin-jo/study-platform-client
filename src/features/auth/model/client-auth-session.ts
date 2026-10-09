import { deleteCookie, setCookie } from '@/api/client/cookie';
import { decodeJwt } from '@/utils/jwt';
import {
  AUTH_COOKIE_NAMES,
  TOKEN_BACKED_AUTH_COOKIE_MAX_AGE_SECONDS,
} from './auth-cookie';
import { AUTH_EVENT_LEVELS, logAuthEvent } from './auth-debug-log';
import { normalizeMemberId } from './auth-session';
import { notifyAuthSessionChanged } from './client-auth-sync';

const getDecodedMemberId = (accessToken: string): string | undefined => {
  const decodedToken = decodeJwt(accessToken);

  return normalizeMemberId(decodedToken?.memberId);
};

// accessToken 쿠키는 1시간 만료라 브라우저 재방문 시 자주 사라진다.
// refresh_token 은 httpOnly 라 클라이언트에서 읽을 수 없으므로, localStorage 에
// 두 가지 마커를 따로 남겨 refresh 프로브를 칠지 말지 판단한다.
//
// - EVER_AUTHENTICATED: 이 브라우저가 로그인한 적이 있다는 마커. 배포 시점에
//   이미 로그인해 있던 기존 사용자도 다음 로그인/토큰 저장 때 이 마커가 새로
//   찍힌다. 이 마커는 "정말 로그인했다"만 확정할 뿐, 없다고 해서 익명이
//   확정되는 것은 아니다.
// - CONFIRMED_ANONYMOUS: refresh 를 실제로 한 번 쳐봤고 그 결과가 명확히
//   무효(INVALID)였다는 마커. 이때만 다음 방문부터 refresh 프로브를 건너뛴다.
//
// 두 마커가 모두 없는 상태("모름")는 배포 직후 기존 로그인 사용자와 진짜
// 첫 방문 익명 사용자를 구분할 수 없다. 이 경우 "모르면 갱신을 쳐본다"
// 원칙에 따라 refresh 를 1회 시도하고, 그 결과로 CONFIRMED_ANONYMOUS 를
// 채워 이후 방문부터는 프로브를 건너뛴다. 그러면 기존 사용자는 로그아웃되지
// 않고, 첫 방문 익명 사용자의 콘솔 400 도 방문당 최대 1회로 줄어든다.
const EVER_AUTHENTICATED_STORAGE_KEY = 'zeroone-ever-authenticated';
const CONFIRMED_ANONYMOUS_STORAGE_KEY = 'zeroone-confirmed-anonymous';

export const markClientSessionEverAuthenticated = (): void => {
  if (typeof window === 'undefined') return;
  // 두 storage 연산을 독립된 try 로 분리한다. 하나가 예외(예: 용량 초과)를
  // 던져도 다른 하나는 반드시 실행돼야 한다. 같은 try 에 묶여 있으면
  // EVER 마커 쓰기가 실패했을 때 CONFIRMED_ANONYMOUS 마커 삭제가 통째로
  // 스킵되어, 로그인에 성공했는데도 낡은 confirmed 마커가 남는 회귀가
  // 있었다(2026-08).
  try {
    window.localStorage.setItem(EVER_AUTHENTICATED_STORAGE_KEY, '1');
  } catch {
    // storage 접근이 막힌 환경에서는 조용히 무시한다. 마커를 못 쓰면 다음
    // 방문에서도 "모름" 상태가 유지될 뿐이고, 그 상태는 refresh 를 계속
    // 쳐보는 쪽(보수적 = 로그인 유지 우선)으로 처리된다.
  }
  try {
    window.localStorage.removeItem(CONFIRMED_ANONYMOUS_STORAGE_KEY);
  } catch {
    // no-op. 삭제가 실패해도 다음 refresh 실패 시 다시 시도된다.
  }
};

export const hasClientSessionEverAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(EVER_AUTHENTICATED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const markClientSessionConfirmedAnonymous = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONFIRMED_ANONYMOUS_STORAGE_KEY, '1');
  } catch {
    // no-op. 못 남기면 다음 방문에서 refresh 를 한 번 더 쳐볼 뿐이고,
    // 손해는 그 한 번의 400 뿐이다.
  }
};

// refresh 프로브를 건너뛰어도 되는가. true 를 반환하는 유일한 경우는
// "이미 refresh 를 시도해봤고 무효였다"가 확정된 때뿐이다. storage 접근이
// 막히거나 마커가 아예 없는 "모름" 상태는 false(=건너뛰지 않음, 프로브를
// 쳐본다) 로 처리한다. 잘못 건너뛰면 로그인 사용자가 로그아웃되지만,
// 잘못 쳐봐도 조용히 익명 처리될 뿐 사용자 손해가 없는 비대칭이기 때문이다.
export const hasClientSessionConfirmedAnonymous = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CONFIRMED_ANONYMOUS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

// 인증 세대 카운터. 로그인이 성공할 때마다 증가한다. localStorage 는
// 같은 origin 의 모든 탭이 공유하므로, 탭 A 가 refresh 요청을 시작한
// 시점의 세대와 응답이 도착한 시점의 세대를 비교하면 "그 사이 다른 탭에서
// 로그인이 일어났는지"를 알 수 있다. 탭 A 가 익명 상태로 refresh 를
// 시작했는데 그 요청이 도착하기 전에 탭 B 에서 로그인이 성공하면, 세대가
// 바뀌었으므로 탭 A 의 낡은 INVALID 응답으로 CONFIRMED_ANONYMOUS 를
// 심으면 안 된다.
const AUTH_GENERATION_STORAGE_KEY = 'zeroone-auth-generation';

export const readClientAuthGeneration = (): number => {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(AUTH_GENERATION_STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;

    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
};

const bumpClientAuthGeneration = (): void => {
  if (typeof window === 'undefined') return;
  try {
    const next = readClientAuthGeneration() + 1;
    window.localStorage.setItem(AUTH_GENERATION_STORAGE_KEY, String(next));
  } catch {
    // no-op. 세대 갱신을 못 남기면 최악의 경우 §차단결함2 재현 조건이
    // 좁아지지 않을 뿐이고, 다른 안전장치(상태코드 검사 등)는 그대로 산다.
  }
};

const clearClientSessionEverAuthenticatedMarker = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(EVER_AUTHENTICATED_STORAGE_KEY);
  } catch {
    // no-op
  }
};

export const clearClientSession = (): void => {
  deleteCookie(AUTH_COOKIE_NAMES.ACCESS_TOKEN);
  deleteCookie(AUTH_COOKIE_NAMES.MEMBER_ID);
  deleteCookie(AUTH_COOKIE_NAMES.SOCIAL_IMAGE_URL);
  clearClientSessionEverAuthenticatedMarker();
  notifyAuthSessionChanged();
};

const tokenBackedCookieOptions = {
  maxAge: TOKEN_BACKED_AUTH_COOKIE_MAX_AGE_SECONDS,
} as const;

export const writeExistingMemberSession = ({
  accessToken,
  memberId,
  profileImageUrl,
}: {
  accessToken: string;
  memberId: string;
  profileImageUrl?: string;
}): boolean => {
  const decodedMemberId = getDecodedMemberId(accessToken);
  const normalizedMemberId = normalizeMemberId(memberId);

  if (
    process.env.NODE_ENV !== 'production' &&
    (!decodedMemberId ||
      !normalizedMemberId ||
      decodedMemberId !== normalizedMemberId)
  ) {
    console.error('기존 회원 세션 저장을 중단합니다.', {
      decodedMemberId,
      memberId: normalizedMemberId,
    });
  }

  if (!decodedMemberId || decodedMemberId !== normalizedMemberId) {
    logAuthEvent({
      level: AUTH_EVENT_LEVELS.ERROR,
      layer: 'client-auth-session',
      message: '기존 회원 세션 저장을 중단합니다.',
      reason:
        'access token의 memberId와 redirect memberId가 일치하지 않습니다.',
      hasAccessToken: true,
      hasIdentityCookie: Boolean(normalizedMemberId),
    });
    clearClientSession();

    return false;
  }

  setCookie(
    AUTH_COOKIE_NAMES.ACCESS_TOKEN,
    accessToken,
    tokenBackedCookieOptions,
  );
  setCookie(
    AUTH_COOKIE_NAMES.MEMBER_ID,
    decodedMemberId,
    tokenBackedCookieOptions,
  );
  markClientSessionEverAuthenticated();
  bumpClientAuthGeneration();

  if (profileImageUrl) {
    setCookie(
      AUTH_COOKIE_NAMES.SOCIAL_IMAGE_URL,
      profileImageUrl,
      tokenBackedCookieOptions,
    );
    notifyAuthSessionChanged();

    return true;
  }

  deleteCookie(AUTH_COOKIE_NAMES.SOCIAL_IMAGE_URL);
  notifyAuthSessionChanged();

  return true;
};

export const writeNewMemberSession = ({
  accessToken,
  profileImageUrl,
}: {
  accessToken: string;
  profileImageUrl?: string;
}): void => {
  setCookie(
    AUTH_COOKIE_NAMES.ACCESS_TOKEN,
    accessToken,
    tokenBackedCookieOptions,
  );
  markClientSessionEverAuthenticated();
  bumpClientAuthGeneration();
  deleteCookie(AUTH_COOKIE_NAMES.MEMBER_ID);

  if (profileImageUrl) {
    setCookie(
      AUTH_COOKIE_NAMES.SOCIAL_IMAGE_URL,
      profileImageUrl,
      tokenBackedCookieOptions,
    );
    notifyAuthSessionChanged();

    return;
  }

  deleteCookie(AUTH_COOKIE_NAMES.SOCIAL_IMAGE_URL);
  notifyAuthSessionChanged();
};

export const writeAccessTokenSession = (
  accessToken: string,
): string | undefined => {
  setCookie(
    AUTH_COOKIE_NAMES.ACCESS_TOKEN,
    accessToken,
    tokenBackedCookieOptions,
  );
  markClientSessionEverAuthenticated();
  bumpClientAuthGeneration();

  const decodedMemberId = getDecodedMemberId(accessToken);

  if (decodedMemberId) {
    setCookie(
      AUTH_COOKIE_NAMES.MEMBER_ID,
      decodedMemberId,
      tokenBackedCookieOptions,
    );
    notifyAuthSessionChanged();

    return decodedMemberId;
  }

  deleteCookie(AUTH_COOKIE_NAMES.MEMBER_ID);
  notifyAuthSessionChanged();

  return undefined;
};
