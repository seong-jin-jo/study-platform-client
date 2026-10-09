import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAuthContextMock, resolveRoutePolicyMock } = vi.hoisted(() => ({
  getAuthContextMock: vi.fn(),
  resolveRoutePolicyMock: vi.fn(),
}));

vi.mock('@/features/auth/server/middleware/auth-context', () => ({
  getAuthContext: getAuthContextMock,
}));

vi.mock('@/features/auth/server/middleware/route-policy', () => ({
  ROUTE_POLICY_KINDS: {
    BYPASS: 'bypass',
    LOGIN: 'login',
    PUBLIC_SESSION: 'public-session',
    SIGN_UP: 'sign-up',
  },
  resolveRoutePolicy: resolveRoutePolicyMock,
}));

describe('middleware BYPASS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>public seo</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
      ),
    );
    getAuthContextMock.mockReturnValue({});
    resolveRoutePolicyMock.mockReturnValue('bypass');
  });

  it('strips spoofed internal auth override headers before SSR reads request headers', async () => {
    const request = {
      url: 'https://zeroone.it.kr/redirection',
      nextUrl: {
        pathname: '/redirection',
      },
      headers: new Headers({
        'x-custom-header': 'keep-me',
        'x-zeroone-auth-session-state': 'authenticated',
        'x-zeroone-auth-access-token': 'spoofed-token',
        'x-zeroone-auth-member-id': '999',
      }),
    } as unknown as NextRequest;

    const { middleware } = await import('./middleware');
    const response = await middleware(request);

    expect(response.headers.get('x-middleware-request-x-custom-header')).toBe(
      'keep-me',
    );
    expect(
      response.headers.get('x-middleware-request-x-zeroone-auth-session-state'),
    ).toBe(null);
    expect(
      response.headers.get('x-middleware-request-x-zeroone-auth-access-token'),
    ).toBe(null);
    expect(
      response.headers.get('x-middleware-request-x-zeroone-auth-member-id'),
    ).toBe(null);
  }, 30_000);

  it('takes the PUBLIC_SEO branch before auth and strips browser credentials', async () => {
    const request = {
      url: 'https://zeroone.it.kr/insights/secure-article',
      nextUrl: { pathname: '/insights/secure-article' },
      headers: new Headers({
        cookie: 'access-token=private',
        authorization: 'Bearer private',
        'x-custom-header': 'keep-me',
        'x-zeroone-auth-session-state': 'authenticated',
        'x-zeroone-auth-access-token': 'private',
        'x-zeroone-auth-member-id': '99',
      }),
    } as unknown as NextRequest;

    const { middleware } = await import('./middleware');
    const response = await middleware(request);

    expect(getAuthContextMock).not.toHaveBeenCalled();
    expect(resolveRoutePolicyMock).not.toHaveBeenCalled();
    expect(response.headers.get('x-middleware-request-x-custom-header')).toBe(
      'keep-me',
    );
    expect(response.headers.get('x-middleware-request-cookie')).toBe(null);
    expect(response.headers.get('x-middleware-request-authorization')).toBe(
      null,
    );
    expect(response.headers.get('set-cookie')).toBe(null);
    expect(fetch).not.toHaveBeenCalled();
  }, 30_000);

  it('keeps an encoded dot inside a valid public slug on the public branch', async () => {
    const request = {
      url: 'https://zeroone.it.kr/insights/node%2ejs',
      nextUrl: { pathname: '/insights/node%2ejs' },
      headers: new Headers(),
    } as unknown as NextRequest;

    const { middleware } = await import('./middleware');
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBe(null);
    expect(getAuthContextMock).not.toHaveBeenCalled();
    expect(resolveRoutePolicyMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      'https://zeroone.it.kr/insights/%2e%2e%2fadmin',
      '/insights/%2e%2e%2fadmin',
    ],
    [
      'https://zeroone.it.kr/community/questions/%2e%2e%2f801',
      '/community/questions/%2e%2e%2f801',
    ],
    [
      'https://zeroone.it.kr/members/not-a-uuid%0d%0aLocation:%20/admin',
      '/members/not-a-uuid%0d%0aLocation:%20/admin',
    ],
  ])('returns an HTML 400 before auth for unsafe public SEO URL %s', async (url, pathname) => {
    const request = {
      url,
      nextUrl: { pathname, searchParams: new URLSearchParams() },
      headers: new Headers(),
    } as unknown as NextRequest;

    const { middleware } = await import('./middleware');
    const response = await middleware(request);

    expect(response.status).toBe(400);
    expect(response.headers.get('location')).toBe(null);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    );
    const body = await response.text();
    expect(body).toContain('잘못된 요청입니다.');
    expect(body).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
    expect(getAuthContextMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns an HTML 404 instead of an auth redirect for an invalid profile UUID', async () => {
    const request = {
      url: 'https://zeroone.it.kr/members/not-a-uuid',
      nextUrl: {
        pathname: '/members/not-a-uuid',
        searchParams: new URLSearchParams(),
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const { middleware } = await import('./middleware');
    const response = await middleware(request);

    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBe(null);
    expect(response.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    );
    const body = await response.text();
    expect(body).toContain('요청한 페이지를 찾을 수 없습니다.');
    expect(body).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
    expect(getAuthContextMock).not.toHaveBeenCalled();
  });

  it.each([
    '/group-study',
    '/test-sentry',
  ])('returns a renderable HTML 404 for retired route %s without entering auth', async (pathname) => {
    const request = {
      url: `https://zeroone.it.kr${pathname}`,
      nextUrl: { pathname, searchParams: new URLSearchParams() },
      headers: new Headers(),
    } as unknown as NextRequest;

    const { middleware } = await import('./middleware');
    const response = await middleware(request);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    );
    expect(await response.text()).toContain(
      '요청한 페이지를 찾을 수 없습니다.',
    );
    expect(getAuthContextMock).not.toHaveBeenCalled();
    expect(resolveRoutePolicyMock).not.toHaveBeenCalled();
  });

  it('keeps fail-closed responses non-cacheable and nosniff', async () => {
    const request = {
      url: 'https://zeroone.it.kr/group-study',
      nextUrl: {
        pathname: '/group-study',
        searchParams: new URLSearchParams(),
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const { middleware } = await import('./middleware');
    const response = await middleware(request);

    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(getAuthContextMock).not.toHaveBeenCalled();
  });

  it('normalizes the exact weekly legacy alias to /insights without auth or sitemap duplication', async () => {
    const request = {
      url: 'https://zeroone.it.kr/insights/weekly?category=dep',
      nextUrl: {
        pathname: '/insights/weekly',
        searchParams: new URLSearchParams('category=dep'),
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const { middleware } = await import('./middleware');
    const response = await middleware(request);

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://zeroone.it.kr/insights',
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(getAuthContextMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
