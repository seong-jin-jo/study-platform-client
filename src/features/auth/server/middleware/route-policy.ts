import {
  AUTH_ROUTE_PATHS,
  AUTH_ROUTE_PREFIXES,
} from "@/features/auth/model/auth-route";

/**
 * 미들웨어가 경로를 해석할 때 사용하는 정책 종류다.
 * - BYPASS: 인증 검증에 개입하지 않고 그대로 통과
 * - LOGIN: 로그인 페이지 전용 규칙 적용
 * - PUBLIC_SESSION: 비회원 접근은 허용하되 세션 유지/정리 수행
 * - SIGN_UP: 신규 회원가입 진행용 규칙 적용
 */
export const ROUTE_POLICY_KINDS = {
  BYPASS: "bypass",
  LOGIN: "login",
  PUBLIC_SESSION: "public-session",
  SIGN_UP: "sign-up",
} as const;

export type RoutePolicyKind =
  (typeof ROUTE_POLICY_KINDS)[keyof typeof ROUTE_POLICY_KINDS];

/**
 * 미들웨어 경로 정책이 path를 어떻게 해석할지 결정하는 매칭 방식이다.
 * - EXACT: path와 정확히 일치해야 함
 * - PREFIX: path 자체 또는 하위 경로까지 포함해 매칭
 */
export const ROUTE_MATCH_TYPES = {
  EXACT: "exact",
  PREFIX: "prefix",
} as const;

export type RouteMatchType =
  (typeof ROUTE_MATCH_TYPES)[keyof typeof ROUTE_MATCH_TYPES];

interface RoutePolicy {
  kind: RoutePolicyKind;
  path: string;
  match: RouteMatchType;
}

const ROUTE_POLICIES: readonly RoutePolicy[] = [
  {
    // 기존 Next 오프라인 안내 경로의 직접 접근 계약은 유지한다. 서비스워커의
    // 폴백은 정적 /offline.html을 쓰며, 인증 범위 확장을 막기 위해 exact만 허용한다.
    kind: ROUTE_POLICY_KINDS.BYPASS,
    path: "/offline",
    match: ROUTE_MATCH_TYPES.EXACT,
  },
  {
    kind: ROUTE_POLICY_KINDS.BYPASS,
    path: AUTH_ROUTE_PATHS.REDIRECTION,
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    kind: ROUTE_POLICY_KINDS.BYPASS,
    path: AUTH_ROUTE_PREFIXES.TEST_SENTRY,
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    kind: ROUTE_POLICY_KINDS.BYPASS,
    path: AUTH_ROUTE_PREFIXES.TEST_SENTRY_SERVER_ERROR,
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    kind: ROUTE_POLICY_KINDS.SIGN_UP,
    path: AUTH_ROUTE_PATHS.SIGN_UP,
    match: ROUTE_MATCH_TYPES.EXACT,
  },
  {
    kind: ROUTE_POLICY_KINDS.LOGIN,
    path: AUTH_ROUTE_PATHS.LOGIN,
    match: ROUTE_MATCH_TYPES.EXACT,
  },
  {
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: AUTH_ROUTE_PATHS.LANDING,
    match: ROUTE_MATCH_TYPES.EXACT,
  },
  {
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/group-study",
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/home",
    match: ROUTE_MATCH_TYPES.EXACT,
  },
  {
    // 통합검색은 비회원도 커뮤니티·인사이트 공개 미리보기를 읽는 발견 경로다.
    // 검색 노출(SEO)과 "둘러보고 방을 고른다"는 진입 경로가 이 화면에 걸려 있어서,
    // 보호 경로 기본값에 맡기면 게스트의 /search와 하위 경로가 홈으로 튕긴다.
    // 2026-08-07 QA에서 실제로 게스트가 전부 홈으로 리다이렉트되는 것을 확인해 추가.
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/search",
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    // 현장 QR은 인증 전에도 세미나 안내를 보여야 한다. 캡처 화면 자체는
    // 클라이언트에서 세션 상태에 따라 로그인/가입 시작점을 안내한다.
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/seminar",
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/onboarding/retention",
    match: ROUTE_MATCH_TYPES.EXACT,
  },
  {
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/mentoring",
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/premium-study",
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    // 레거시 단수 경로. 비회원 SEO 유입도 /insights로 정상 리다이렉트되어야 하므로
    // 미들웨어가 /home으로 가로채지 않도록 공개 세션으로 둔다.
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/insight",
    match: ROUTE_MATCH_TYPES.EXACT,
  },
  {
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/one-on-one",
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/inquiry",
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/class",
    match: ROUTE_MATCH_TYPES.PREFIX,
  },
  {
    // 영문 회사 소개. 해외 프로그램 심사자가 로그인 없이 사업자 실체를 확인한다.
    kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
    path: "/about",
    match: ROUTE_MATCH_TYPES.EXACT,
  },
] as const;

const matchesRoutePolicy = (pathname: string, policy: RoutePolicy): boolean => {
  if (policy.match === ROUTE_MATCH_TYPES.EXACT) {
    return pathname === policy.path;
  }

  return pathname === policy.path || pathname.startsWith(`${policy.path}/`);
};

export const resolveRoutePolicy = (
  pathname: string,
): RoutePolicyKind | undefined =>
  ROUTE_POLICIES.find((policy) => matchesRoutePolicy(pathname, policy))?.kind;
