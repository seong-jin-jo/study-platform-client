import { AUTH_ROUTE_PATHS, getSafeInternalRedirectPath } from './auth-route';

const OAUTH_CALLBACK_STORAGE_KEY = 'zero-one:oauth-callback-path';

export const normalizeOAuthCallbackPath = (
  candidate: string | null | undefined,
): string => {
  const safePath = getSafeInternalRedirectPath(
    candidate,
    AUTH_ROUTE_PATHS.LANDING,
  );
  const pathname = safePath.split(/[?#]/, 1)[0];
  if (
    safePath.includes('\\') ||
    pathname === AUTH_ROUTE_PATHS.LOGIN ||
    pathname === AUTH_ROUTE_PATHS.REDIRECTION ||
    pathname === '/api' ||
    pathname.startsWith('/api/')
  ) {
    return AUTH_ROUTE_PATHS.LANDING;
  }
  return safePath;
};

export const buildLoginPathForCallback = (candidate: string): string =>
  `${AUTH_ROUTE_PATHS.LOGIN}?callbackUrl=${encodeURIComponent(
    normalizeOAuthCallbackPath(candidate),
  )}`;

/**
 * 제어문자(U+0000~U+001F, U+007F) 포함 여부.
 * 정규식 리터럴로 쓰면 lint 규칙 no-control-regex 에 걸리므로
 * 동일한 판정을 코드포인트 비교로 수행한다. 차단 범위는 그대로다.
 */
const hasControlCharacter = (value: string): boolean => {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return true;
    }
  }
  return false;
};

/**
 * 인사이트 잠금 화면은 외부 origin뿐 아니라 다른 제품 경로도 callback으로 받지 않는다.
 * 한 번만 decode된 상대 경로 중 `/insights/` 하위만 허용한다.
 */
export const normalizeInsightCallbackPath = (
  candidate: string | null | undefined,
  fallbackPath = '/insights',
): string => {
  if (
    typeof candidate !== 'string' ||
    candidate.includes('\\') ||
    hasControlCharacter(candidate) ||
    /%25(?:2f|5c|3a)/iu.test(candidate)
  ) {
    return fallbackPath;
  }

  const safePath = getSafeInternalRedirectPath(candidate, fallbackPath);
  const pathname = safePath.split(/[?#]/, 1)[0];
  return pathname.startsWith('/insights/') ? safePath : fallbackPath;
};

export const buildLoginPathForInsightCallback = (
  candidate: string,
  fallbackPath = '/insights',
): string =>
  `${AUTH_ROUTE_PATHS.LOGIN}?callbackUrl=${encodeURIComponent(
    normalizeInsightCallbackPath(candidate, fallbackPath),
  )}`;

export const storeOAuthCallbackPath = (
  candidate: string | null | undefined,
): void => {
  const path = normalizeOAuthCallbackPath(candidate);
  if (path === AUTH_ROUTE_PATHS.LANDING) {
    window.sessionStorage.removeItem(OAUTH_CALLBACK_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(OAUTH_CALLBACK_STORAGE_KEY, path);
};

export const consumeOAuthCallbackPath = (): string => {
  const candidate = window.sessionStorage.getItem(OAUTH_CALLBACK_STORAGE_KEY);
  window.sessionStorage.removeItem(OAUTH_CALLBACK_STORAGE_KEY);
  return normalizeOAuthCallbackPath(candidate);
};
