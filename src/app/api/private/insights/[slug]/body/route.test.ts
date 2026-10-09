import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveArticleAccess: vi.fn(),
  readServerAccessToken: vi.fn(),
}));

vi.mock('@/api/product/article-access', () => {
  class ArticleAccessError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
    ) {
      super(code);
    }
  }

  return {
    ArticleAccessError,
    resolveArticleAccess: mocks.resolveArticleAccess,
  };
});
vi.mock('@/features/auth/model/server-auth-session', () => ({
  readServerAccessToken: mocks.readServerAccessToken,
}));

import { GET } from './route';

const invoke = (headers: HeadersInit = {}) =>
  GET(
    new Request('https://www.zeroone.it.kr/api/private/insights/article/body', {
      headers,
    }),
    { params: Promise.resolve({ slug: 'article' }) },
  );

describe('private article body BFF browser signal boundary', () => {
  beforeEach(() => {
    vi.stubEnv('APP_ORIGIN', 'https://www.zeroone.it.kr');
    mocks.resolveArticleAccess.mockReset();
    mocks.readServerAccessToken.mockReset();
    mocks.readServerAccessToken.mockResolvedValue(undefined);
    mocks.resolveArticleAccess.mockResolvedValue({
      state: 'UNLOCKED',
      authDegraded: false,
      meta: {},
      fetchBody: vi.fn().mockResolvedValue({
        id: 1,
        documentId: 'doc-1',
        slug: 'article',
        title: 'Article',
        description: 'Body',
      }),
    });
  });

  it.each([
    new Headers({
      origin: 'https://www.zeroone.it.kr',
      'sec-fetch-site': 'same-origin',
    }),
    new Headers({ origin: 'https://www.zeroone.it.kr' }),
    new Headers({ 'sec-fetch-site': 'same-origin' }),
  ])('allows a same-origin browser signal: %o', async (headers) => {
    const response = await invoke(headers);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.resolveArticleAccess).toHaveBeenCalledOnce();
  });

  it.each([
    new Headers(),
    new Headers({ origin: 'https://attacker.example' }),
    new Headers({ origin: 'null' }),
    new Headers({
      origin: 'https://www.zeroone.it.kr',
      'sec-fetch-site': 'same-site',
    }),
    new Headers({
      origin: 'https://www.zeroone.it.kr',
      'sec-fetch-site': 'cross-site',
    }),
    new Headers({
      origin: 'https://www.zeroone.it.kr',
      'sec-fetch-site': 'none',
    }),
  ])('rejects a non-browser or non-same-origin signal: %o', async (headers) => {
    const response = await invoke(headers);

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.resolveArticleAccess).not.toHaveBeenCalled();
  });

  it('keeps the approved private author email after access succeeds', async () => {
    mocks.resolveArticleAccess.mockResolvedValue({
      state: 'UNLOCKED',
      authDegraded: false,
      meta: {},
      fetchBody: vi.fn().mockResolvedValue({
        documentId: 'doc-1',
        slug: 'article',
        author: { name: 'ZERO-ONE', email: 'editor@zeroone.test' },
      }),
    });

    const response = await invoke({ 'sec-fetch-site': 'same-origin' });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      article: { author: { email: 'editor@zeroone.test' } },
    });
  });

  it.each([
    ['AUTHENTICATION_REQUIRED', 401],
    ['BUDGET_REQUIRED', 403],
  ])('does not return a locked body for %s', async (reason, status) => {
    mocks.resolveArticleAccess.mockResolvedValue({
      state: 'LOCKED',
      authDegraded: false,
      teaser: { accessReason: reason },
    });

    const response = await invoke({ 'sec-fetch-site': 'same-origin' });

    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain('article');
  });

  it('fails closed with 503 when the private serializer rejects unsafe content', async () => {
    const unsafeContentError = Object.assign(
      new Error('Unsafe Strapi article content was rejected'),
      {
        name: 'UnsafeStrapiArticleContentError',
        code: 'UNSAFE_STRAPI_ARTICLE_CONTENT',
      },
    );
    mocks.resolveArticleAccess.mockResolvedValue({
      state: 'UNLOCKED',
      authDegraded: false,
      meta: {},
      fetchBody: vi.fn().mockRejectedValue(unsafeContentError),
    });

    const response = await invoke({ 'sec-fetch-site': 'same-origin' });

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      code: 'SEO002',
      message: 'Article body request was rejected',
    });
  });

  it('does not reuse member A body capability for member B or anonymous requests', async () => {
    const privateBody = {
      documentId: 'doc-1',
      slug: 'article',
      title: 'A_PRIVATE_BODY',
    };
    mocks.readServerAccessToken
      .mockResolvedValueOnce('member-a-token')
      .mockResolvedValueOnce('member-b-token')
      .mockResolvedValueOnce(undefined);
    mocks.resolveArticleAccess
      .mockResolvedValueOnce({
        state: 'UNLOCKED',
        authDegraded: false,
        meta: {},
        fetchBody: vi.fn().mockResolvedValue(privateBody),
      })
      .mockResolvedValueOnce({
        state: 'LOCKED',
        authDegraded: false,
        teaser: { accessReason: 'BUDGET_REQUIRED' },
      })
      .mockResolvedValueOnce({
        state: 'LOCKED',
        authDegraded: false,
        teaser: { accessReason: 'AUTHENTICATION_REQUIRED' },
      });

    const allowedHeaders = {
      origin: 'https://www.zeroone.it.kr',
      'sec-fetch-site': 'same-origin',
    };
    const memberA = await invoke(allowedHeaders);
    const memberB = await invoke(allowedHeaders);
    const anonymous = await invoke(allowedHeaders);

    expect(memberA.status).toBe(200);
    expect(await memberA.text()).toContain('A_PRIVATE_BODY');
    expect(memberB.status).toBe(403);
    expect(await memberB.text()).not.toContain('A_PRIVATE_BODY');
    expect(anonymous.status).toBe(401);
    expect(await anonymous.text()).not.toContain('A_PRIVATE_BODY');
    expect(mocks.resolveArticleAccess).toHaveBeenNthCalledWith(
      1,
      'article',
      'member-a-token',
    );
    expect(mocks.resolveArticleAccess).toHaveBeenNthCalledWith(
      2,
      'article',
      'member-b-token',
    );
    expect(mocks.resolveArticleAccess).toHaveBeenNthCalledWith(
      3,
      'article',
      undefined,
    );
  });
});
