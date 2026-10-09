import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createRequestHeadersWithServerAuthSessionOverride } from '@/features/auth/model/server-auth-session-override';
import { getAuthContext } from '@/features/auth/server/middleware/auth-context';
import { isLegacyRoute } from '@/features/auth/server/middleware/legacy-routes';
import {
  handleLogin,
  handleProtected,
  handlePublicSessionRoute,
  handleSignUp,
} from '@/features/auth/server/middleware/route-handlers';
import {
  ROUTE_POLICY_KINDS,
  resolveRoutePolicy,
} from '@/features/auth/server/middleware/route-policy';
import {
  createPublicSeoRequestHeaders,
  extractRawPathname,
  PUBLIC_SEO_PATH_KINDS,
  resolvePublicSeoPath,
} from '@/features/seo/model/public-seo-route';

const FAIL_CLOSED_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'text/html; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
} as const;

const failClosedBody = (status: 400 | 404) => {
  const message =
    status === 404 ? '요청한 페이지를 찾을 수 없습니다.' : '잘못된 요청입니다.';

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${message}</title></head><body><main><h1>${message}</h1></main></body></html>`;
};

const failClosed = (status: 400 | 404) =>
  new NextResponse(failClosedBody(status), {
    status,
    headers: FAIL_CLOSED_HEADERS,
  });

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicSeoDecision = resolvePublicSeoPath(
    pathname,
    extractRawPathname(request.url),
  );

  if (publicSeoDecision.kind === PUBLIC_SEO_PATH_KINDS.INVALID) {
    return failClosed(publicSeoDecision.status);
  }

  if (pathname === '/insights/weekly') {
    return NextResponse.redirect(new URL('/insights', request.url), {
      status: 308,
      headers: FAIL_CLOSED_HEADERS,
    });
  }

  if (isLegacyRoute(pathname)) {
    // rewrite 는 목적지 화면을 보여주지만 **상태 코드는 200 그대로**다.
    // 그래서 폐기 라우트 18개가 사람 눈에는 없는 페이지인데 크롤러에게는
    // 정상 문서로 보였다(2026-08-21 실측: dev·운영 모두 200,
    // 응답 헤더 x-middleware-rewrite: /not-found). 소프트 404 다.
    // 검색 노출 스프린트에서 폐기 화면이 색인 대상이 되는 것은 그 자체가 결함이고,
    // /test-sentry 와 /admin/clipboard-inspector 같은 디버그 화면까지 열려 있었다.
    // 상태 코드를 실제 404 로 준다.
    return failClosed(404);
  }

  if (publicSeoDecision.kind === PUBLIC_SEO_PATH_KINDS.PUBLIC) {
    return NextResponse.next({
      request: { headers: createPublicSeoRequestHeaders(request.headers) },
    });
  }

  const ctx = getAuthContext(request);
  const routePolicy = resolveRoutePolicy(pathname);

  switch (routePolicy) {
    case ROUTE_POLICY_KINDS.BYPASS:
      return NextResponse.next({
        request: {
          headers: createRequestHeadersWithServerAuthSessionOverride({
            requestHeaders: request.headers,
          }),
        },
      });
    case ROUTE_POLICY_KINDS.SIGN_UP:
      return handleSignUp(request, ctx);
    case ROUTE_POLICY_KINDS.LOGIN:
      return handleLogin(request, ctx);
    case ROUTE_POLICY_KINDS.PUBLIC_SESSION:
      return handlePublicSessionRoute(request, ctx);
    default:
      return handleProtected(request, ctx);
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
