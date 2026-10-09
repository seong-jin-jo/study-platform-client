import { beforeEach, describe, expect, it, vi } from 'vitest';

const strapiFetch = vi.fn();
const strapiFetchNoStore = vi.fn();
const toRenderableArticle = vi.fn((article) => article);

vi.mock('server-only', () => ({}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(value: T) => value,
}));
vi.mock('@/api/strapi/api/common-strapi-fetch', () => ({
  strapiFetch,
  strapiFetchNoStore,
}));
vi.mock('@/api/strapi/api/fetch-articles', () => ({
  fetchArticles: vi.fn(),
  fetchCategories: vi.fn(),
}));
vi.mock('@/api/strapi/api/media-url', () => ({
  toAbsoluteMediaUrl: vi.fn((value) => value),
  toRenderableArticle,
}));

const accessPayload = {
  documentId: 'doc-1',
  slug: 'event-loop',
  title: '이벤트 루프는 왜 필요한가',
  islandId: 1,
  islandSlug: 'web',
  islandName: '웹의 섬',
  ordinal: 1,
  teaser: '브라우저가 일을 나누는 방법',
  coverUrl: 'http://strapi.test/uploads/cover.png',
  unlockCost: 0,
  budget: { balance: 5, dailyCap: 5 },
  freeAlternative: null,
};

const response = (status: number, data?: Record<string, unknown>) =>
  new Response(
    JSON.stringify({
      code: status === 200 ? 'SUCCESS' : 'AUTH001',
      message: '',
      ...(data ? { data } : {}),
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );

describe('resolveArticleAccess', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://product.test');
  });

  it('LOCKED 결과에는 본문 클로저가 없고 Strapi를 호출하지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(200, {
          ...accessPayload,
          accessMode: 'LOCKED',
          accessReason: 'BUDGET_REQUIRED',
          unlockCost: 1,
        }),
      ),
    );
    const { resolveArticleAccess } = await import('./article-access');

    const result = await resolveArticleAccess('event-loop', 'member-token');

    expect(result.state).toBe('LOCKED');
    expect('fetchBody' in result).toBe(false);
    expect(strapiFetch).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      'http://product.test/api/v2/insight/articles/by-slug/event-loop/access',
      expect.objectContaining({
        cache: 'no-store',
        headers: { Authorization: 'Bearer member-token' },
      }),
    );
  });

  it('열린 글은 판정 시점 documentId만 캡처한 무인자 클로저를 준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(200, { ...accessPayload, accessMode: 'PUBLIC_FULL' }),
        ),
    );
    const renderable = { documentId: 'doc-1', slug: 'event-loop' };
    strapiFetchNoStore.mockResolvedValue({
      data: [renderable],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    });
    const { resolveArticleAccess } = await import('./article-access');

    const result = await resolveArticleAccess('event-loop');

    expect(result.state).toBe('FREE');
    if (result.state === 'LOCKED') throw new Error('FREE access expected');
    expect(result.fetchBody).toHaveLength(0);
    await expect(result.fetchBody()).resolves.toBe(renderable);
    expect(strapiFetchNoStore).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/api\/articles\?.*filters\[documentId\]\[\$eq\]=doc-1/,
      ),
    );
    expect(toRenderableArticle).toHaveBeenCalledWith(renderable);
  });

  it('배포 창의 구 accessLevel=FREE 응답도 공개 본문으로 읽는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        // accessMode 를 아직 모르는 구 백엔드 응답이다.
        response(200, { ...accessPayload, accessLevel: 'FREE' }),
      ),
    );
    const { resolveArticleAccess } = await import('./article-access');

    const result = await resolveArticleAccess('event-loop');

    expect(result.state).toBe('FREE');
  });

  it('accessMode 와 accessLevel 이 모두 없으면 LOCKED 로 접는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(200, { ...accessPayload })),
    );
    const { resolveArticleAccess } = await import('./article-access');

    const result = await resolveArticleAccess('event-loop');

    expect(result.state).toBe('LOCKED');
  });

  it('keeps approved author email in the private body and removes it from the public body', async () => {
    const renderable = {
      documentId: 'doc-1',
      slug: 'event-loop',
      author: { name: 'ZERO-ONE', email: 'editor@zeroone.test' },
    };
    strapiFetchNoStore.mockResolvedValue({
      data: [renderable],
      meta: { pagination: { page: 1, pageSize: 1, pageCount: 1, total: 1 } },
    });
    const { fetchPublicArticleBodyByDocumentId } = await import(
      './article-access'
    );

    const publicBody = await fetchPublicArticleBodyByDocumentId('doc-1');

    expect(publicBody.author).toEqual({ name: 'ZERO-ONE' });
    expect(publicBody.author).not.toHaveProperty('email');
    expect(toRenderableArticle).toHaveBeenCalledWith(renderable);
  });

  it('sitemap catalog는 slug와 updatedAt만 요청하고 populate하지 않는다', async () => {
    strapiFetch.mockResolvedValue({
      data: [{ slug: 'event-loop', updatedAt: '2026-08-06T00:00:00.000Z' }],
      meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } },
    });
    const { fetchPublicSitemapCatalog } = await import('./article-access');

    await expect(fetchPublicSitemapCatalog()).resolves.toEqual([
      { slug: 'event-loop', updatedAt: '2026-08-06T00:00:00.000Z' },
    ]);
    const requestPath = strapiFetch.mock.calls[0]?.[0] as string;
    const query = new URL(requestPath, 'http://strapi.test').searchParams;

    expect(query.getAll('fields[0]')).toEqual(['slug']);
    expect(query.getAll('fields[1]')).toEqual(['updatedAt']);
    expect(query.has('populate')).toBe(false);
  });

  it('만료 토큰 401은 RSC에서 갱신하지 않고 익명 판정으로 강등한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(
        response(200, {
          ...accessPayload,
          accessMode: 'LOCKED',
          accessReason: 'AUTHENTICATION_REQUIRED',
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { resolveArticleAccess } = await import('./article-access');

    const result = await resolveArticleAccess('event-loop', 'expired-token');

    expect(result.state).toBe('LOCKED');
    expect(result.authDegraded).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      cache: 'no-store',
      headers: undefined,
    });
  });
});
