import { AUTH_ROUTE_PATHS } from './auth-route';

/**
 * 로그인 복귀 주소(/redirection?access-token=…&member-id=…)는 인증 정보를 쿼리로 실어 온다.
 * 분석 도구(GA4·GTM·Clarity·Meta·당근)는 현재 주소를 통째로 수집하므로, 이 주소가 그대로
 * 주소창에 남아 있는 동안 어떤 분석 요청이 나가도 토큰과 회원 번호가 같이 나간다.
 * 2026-11-13 운영에서 GA4 page_view·scroll 의 page_location 에 실려 저장된 것이 확인됐다.
 *
 * 그래서 토큰을 읽은 즉시 주소에서 쿼리를 지운다. 이 호출은 분석 스크립트가 수집 요청을
 * 만들기 전(같은 effect 일괄 처리 안)에 끝나야 한다.
 */

/** 분석 도구가 자동 page_view·세션 녹화를 하면 안 되는 인증 복귀 경로인지 본다. */
export const isOAuthRedirectPath = (
  // usePathname() 이 null 을 돌려줄 수 있어 그대로 받는다.
  // eslint-disable-next-line @rushstack/no-new-null
  pathname: string | null | undefined,
): boolean => {
  if (typeof pathname !== 'string') {
    return false;
  }

  return (
    pathname === AUTH_ROUTE_PATHS.REDIRECTION ||
    pathname.startsWith(`${AUTH_ROUTE_PATHS.REDIRECTION}/`)
  );
};

/**
 * 현재 주소에서 쿼리와 해시를 지운다. 경로와 history state 는 유지한다. 지웠으면 true.
 * 현재 state 를 그대로 넘기므로(__NA 포함) Next 라우터는 이 replaceState 를 가로채지 않는다
 * (app-router.js 의 replaceState 패치가 __NA 가 있으면 원본을 바로 호출한다). 따라서 라우터의
 * useSearchParams 값은 다음 내비게이션까지 그대로 남고, 주소창만 비워진다.
 * 주소가 비워진 뒤에는 읽을 수 없으므로 필요한 값은 호출 전에 쥐고 있어야 한다.
 */
export const scrubOAuthRedirectUrl = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const { pathname, search, hash } = window.location;
  if (!search && !hash) {
    return false;
  }

  try {
    // state 를 유지해야 Next 의 내부 history 정보(__NA 등)가 지워지지 않는다.
    window.history.replaceState(window.history.state, '', pathname);

    return true;
  } catch {
    // 주소를 못 지우는 환경이면 분석 쪽 차단(isOAuthRedirectPath)이 마지막 방어선이다.
    return false;
  }
};

/**
 * 서버가 HTML 에 심는 인라인 스크립트의 보관 변수 이름이다.
 * 분석 스크립트(GA4·GTM·Clarity)는 하이드레이션 뒤에 로드되지만, 그 시점이 컨트롤러 effect 보다
 * 앞설 수 있다(Suspense 안의 컨트롤러는 레이아웃보다 늦게 하이드레이션된다. 2026-11-13 로컬 실측:
 * 컨트롤러 정리 전에 gtag 가 이미 전체 주소를 읽어 page_view 의 dr(참조 주소)에 토큰이 실렸다).
 * 그래서 HTML 파싱 중에 먼저 쿼리를 보관하고 주소를 지운다.
 */
export const OAUTH_REDIRECT_STASH_KEY = '__ZO_OAUTH_REDIRECT_SEARCH__';

/**
 * 인라인으로 실행되는 문자열이다. isOAuthRedirectPath 와 같은 판정을 브라우저 주소로 한다.
 * 보관은 이 탭의 JS 변수 하나뿐이다(저장소·쿠키·네트워크에 쓰지 않는다).
 */
export const OAUTH_REDIRECT_BOOTSTRAP_SCRIPT = `(function(){try{var l=window.location;if(!/^\\/redirection(\\/|$)/.test(l.pathname)||!l.search)return;window[${JSON.stringify(
  OAUTH_REDIRECT_STASH_KEY,
)}]=l.search;window.history.replaceState(window.history.state,'',l.pathname);}catch(e){}})();`;

/** 부트스트랩이 보관한 쿼리를 한 번만 꺼낸다. 없으면 undefined. */
export const takeStashedOAuthRedirectSearch = ():
  | URLSearchParams
  | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const holder = window as unknown as Record<string, unknown>;
  const stashed = holder[OAUTH_REDIRECT_STASH_KEY];
  if (typeof stashed !== 'string') {
    return undefined;
  }

  delete holder[OAUTH_REDIRECT_STASH_KEY];

  return new URLSearchParams(stashed);
};
