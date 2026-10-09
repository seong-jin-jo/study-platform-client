import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getCommunitySeoDocumentInServer,
  getCommunitySitemapResourcesInServer,
  toSafeLegacyTeaser,
} from './community-seo.server';

const page = ({
  items = [],
  nextCursor = null,
  snapshot = 'snapshot-a',
  totalItems = items.length,
}: {
  items?: Array<{
    type: 'POST';
    id: number;
    canonicalPath: string;
    updatedAt: string;
  }>;
  nextCursor?: string | null;
  snapshot?: string;
  totalItems?: number;
}) =>
  new Response(
    JSON.stringify({
      content: { items, nextCursor, snapshot, totalItems },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

const item = (id: number, canonicalPath = `/community/${id}`) => ({
  type: 'POST' as const,
  id,
  canonicalPath,
  updatedAt: '2026-08-16T06:00:00+09:00',
});

describe('community sitemap fail-closed traversal', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.zeroone.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('rejects a malformed success envelope instead of returning an empty sitemap', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(getCommunitySitemapResourcesInServer()).rejects.toThrow(
      'malformed envelope',
    );
  });

  it('rejects a changed snapshot before emitting a partial result', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          page({
            items: [item(1)],
            nextCursor: 'cursor-1',
            snapshot: 'snapshot-a',
            totalItems: 2,
          }),
        )
        .mockResolvedValueOnce(
          page({
            items: [item(2)],
            snapshot: 'snapshot-b',
            totalItems: 2,
          }),
        ),
    );

    await expect(getCommunitySitemapResourcesInServer()).rejects.toThrow(
      'snapshot changed',
    );
  });

  it('rejects a repeated cursor and terminates without looping', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        page({
          items: [item(1)],
          nextCursor: 'cursor-1',
          totalItems: 3,
        }),
      )
      .mockResolvedValueOnce(
        page({
          items: [item(2)],
          nextCursor: 'cursor-1',
          totalItems: 3,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCommunitySitemapResourcesInServer()).rejects.toThrow(
      'cursor cycle',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects duplicate canonical paths and signed total mismatches', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          page({
            items: [item(1)],
            nextCursor: 'cursor-1',
            totalItems: 2,
          }),
        )
        .mockResolvedValueOnce(
          page({
            items: [item(2, '/community/1')],
            totalItems: 2,
          }),
        ),
    );
    await expect(getCommunitySitemapResourcesInServer()).rejects.toThrow(
      'duplicate',
    );

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          page({
            items: [item(1)],
            nextCursor: 'cursor-1',
            totalItems: 2,
          }),
        )
        .mockResolvedValueOnce(page({ items: [item(2)], totalItems: 3 })),
    );
    await expect(getCommunitySitemapResourcesInServer()).rejects.toThrow(
      'signed total changed',
    );
  });

  it('stops after three consecutive watermark invalidations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'SEO004' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCommunitySitemapResourcesInServer()).rejects.toThrow(
      'invalidated repeatedly',
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('community SEO rollout compatibility adapter', () => {
  const legacy = {
    postId: 91,
    canonicalPath: '/community/91',
    title: '롤백 기준',
    previewText: '공개 요약',
    gatedBodyHtml: '<p>LOCKED_CANARY_9f31</p>',
    gatedCssSelector: '#private-body',
    hasPart: { text: 'private' },
    author: { nickname: '작성자', canonicalPath: '/members/member-a' },
    sourceRoom: {
      roomId: 17,
      name: '배포방',
      canonicalPath: '/community/rooms/17',
    },
    publishedAt: '2026-08-10T09:00:00+09:00',
    updatedAt: '2026-08-16T06:00:00+09:00',
  };

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.zeroone.test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('drops all legacy private keys before returning React-consumable props', () => {
    const safe = toSafeLegacyTeaser(legacy);

    expect(safe).not.toHaveProperty('gatedBodyHtml');
    expect(safe).not.toHaveProperty('gatedCssSelector');
    expect(safe).not.toHaveProperty('hasPart');
    expect(JSON.stringify(safe)).not.toContain('LOCKED_CANARY_9f31');
    expect(safe).toMatchObject({
      accessMode: 'TEASER',
      bodyAccess: 'ROOM_MEMBER',
      publicSummaryText: '공개 요약',
    });
  });

  it('uses the safe legacy adapter only when v2 is absent', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ content: legacy }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getCommunitySeoDocumentInServer(91);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toContain('/api/v2/');
    expect(fetchMock.mock.calls[1]?.[0].toString()).toContain('/api/v1/');
    expect(JSON.stringify(result)).not.toContain('LOCKED_CANARY_9f31');
  });

  it('keeps v2 primary and never reads the legacy endpoint after v2 success', async () => {
    const current = {
      resourceType: 'COMMUNITY_POST',
      postId: 92,
      canonicalPath: '/community/92',
      title: '안전한 v2',
      publicSummaryText: '요약',
      publicSummaryHtml: '<p>요약</p>',
      accessMode: 'TEASER',
      bodyAccess: 'ROOM_MEMBER',
      author: { name: '작성자' },
      commentCount: 0,
      likeCount: 0,
      viewCount: 0,
      publishedAt: '2026-08-10T09:00:00+09:00',
      updatedAt: '2026-08-16T06:00:00+09:00',
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: current }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await getCommunitySeoDocumentInServer(92)).toEqual(current);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toContain('/api/v2/');
  });
});
