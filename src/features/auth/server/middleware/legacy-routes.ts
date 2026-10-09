const LEGACY_ROUTE_PREFIXES = [
  '/group-study',
  '/premium-study',
  '/mentoring',
  '/one-on-one',
  '/developer-registration',
  '/application-list',
  '/mentoring-management',
  '/my-mentoring',
  '/my-study-review',
  '/my-study',
  '/note-consultation',
  '/settlement-management',
  '/admin/mentoring',
  '/inquiry',
  '/payment-management',
  '/test-sentry',
  '/test-sentry-server-error',
] as const;

const LEGACY_ROUTE_EXACT = [
  '/community/questions/error-preview',
  '/admin/clipboard-inspector',
] as const;

export const isLegacyRoute = (pathname: string): boolean =>
  LEGACY_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  ) || LEGACY_ROUTE_EXACT.some((p) => pathname === p);
