import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/endpoints/community/community-seo.server', () => ({
  getCommunitySitemapResourcesInServer: vi.fn(),
}));
vi.mock('@/api/endpoints/community/public-profile.server', () => ({
  getPublicProfileSitemapResourcesInServer: vi.fn(),
}));
vi.mock('@/api/product/article-access', () => ({
  fetchPublicSitemapCatalog: vi.fn(),
}));
vi.mock('./insight-seo.server', () => ({
  getInsightMapForSeo: vi.fn(),
}));
import {
  buildPartitions,
  buildSitemapIndexXml,
  buildUrlsetXml,
  resourcesForPartition,
  STATIC_SITEMAP_PATHS,
  verifyPartition,
  type SitemapResource,
} from './sitemap.server';

const resource = (key: string): SitemapResource => ({
  type: 'ARTICLE',
  key,
  canonicalPath: `/insights/${key}`,
  updatedAt: '2026-08-16T06:00:00+09:00',
});

describe('atomic sitemap partitions', () => {
  afterEach(() => vi.useRealTimers());

  it('signs a stable range and rejects tampered tokens', () => {
    const partitions = buildPartitions([resource('a'), resource('b')]);
    const token = partitions[0].token;
    const payload = verifyPartition(token);

    expect(payload).toMatchObject({
      type: 'ARTICLE',
      lowerExclusiveKey: null,
      upperInclusiveKey: 'b',
    });
    expect(
      resourcesForPartition([resource('a'), resource('b')], payload!),
    ).toHaveLength(2);
    expect(verifyPartition(`${token}tampered`)).toBeUndefined();
  });

  it('keeps a permanent stable capability while backend snapshots remain short lived', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T08:00:00Z'));
    const firstToken = buildPartitions([resource('a')])[0].token;
    vi.setSystemTime(new Date('2026-08-16T20:00:00Z'));
    const secondToken = buildPartitions([resource('a')])[0].token;

    expect(secondToken).toBe(firstToken);

    vi.setSystemTime(new Date('2036-08-23T23:59:59Z'));
    expect(verifyPartition(firstToken)).toBeDefined();
    expect(buildPartitions([resource('a')])[0].token).toBe(firstToken);
  });

  it('includes every approved static discovery route', () => {
    expect(STATIC_SITEMAP_PATHS).toEqual([
      '/',
      '/home',
      '/insights',
      '/insights/koans',
      '/community',
    ]);
  });

  it('escapes XML and builds a sitemap index without partial output', () => {
    const xml = buildUrlsetXml([
      { ...resource('a'), canonicalPath: '/insights/a&b' },
    ]);
    const index = buildSitemapIndexXml(buildPartitions([resource('a')]));

    expect(xml).toContain('/insights/a&amp;b');
    expect(xml).toMatch(/^<\?xml[^>]+><urlset/);
    expect(index).toContain('<sitemapindex');
    expect(index).toContain('/sitemaps/article/');
  });

  it('preflights 50,001 URLs into shards of at most 50,000 URLs', () => {
    const resources = Array.from({ length: 50_001 }, (_, index) =>
      resource(String(index).padStart(5, '0')),
    );

    const partitions = buildPartitions(resources);

    expect(partitions).toHaveLength(2);
    for (const partition of partitions) {
      const payload = verifyPartition(partition.token)!;
      expect(
        resourcesForPartition(resources, payload).length,
      ).toBeLessThanOrEqual(50_000);
    }
  });

  it('renders a 10,000 URL fixture within 10 seconds and 512 MiB heap growth', () => {
    const resources = Array.from({ length: 10_000 }, (_, index) =>
      resource(String(index).padStart(5, '0')),
    );
    const heapBefore = process.memoryUsage().heapUsed;
    const startedAt = performance.now();

    const partitions = buildPartitions(resources);
    const xml = buildUrlsetXml(
      resourcesForPartition(resources, verifyPartition(partitions[0].token)!),
    );

    const elapsedMs = performance.now() - startedAt;
    const heapGrowth = Math.max(0, process.memoryUsage().heapUsed - heapBefore);
    expect(partitions).toHaveLength(1);
    expect(xml.match(/<url>/g)).toHaveLength(10_000);
    expect(elapsedMs).toBeLessThan(10_000);
    expect(heapGrowth).toBeLessThan(512 * 1024 * 1024);
  });

  it('splits by UTF-8 byte size and rejects a post-generation oversized shard', () => {
    const longSegment = '가'.repeat(24_000);
    const resources = Array.from({ length: 800 }, (_, index) => ({
      ...resource(String(index).padStart(4, '0')),
      canonicalPath: `/insights/${index}-${longSegment}`,
    }));

    expect(() => buildUrlsetXml(resources)).toThrow(
      'Sitemap shard limit exceeded',
    );
    const partitions = buildPartitions(resources);
    expect(partitions.length).toBeGreaterThan(1);
    for (const partition of partitions) {
      const payload = verifyPartition(partition.token)!;
      const xml = buildUrlsetXml(resourcesForPartition(resources, payload));
      expect(Buffer.byteLength(xml, 'utf8')).toBeLessThanOrEqual(
        50 * 1024 * 1024,
      );
    }
  });
  it('builds partitions without Node 21+ only APIs (배포 이미지는 node:20)', () => {
    // package.json engines 는 >=20.9.0 이고 배포 이미지는 node:20-alpine 이다.
    // Map.groupBy 를 쓰면 실서버에서 TypeError 로 죽어 /sitemap.xml 이 503 이 된다
    // (2026-08-17 QA 관측). 개발 기계 Node 가 더 높아 로컬에서는 안 잡혔다.
    // Node 21+ 전용 API 를 지운 상태에서도 동작하는지 확인한다.
    const originalMapGroupBy = (Map as unknown as { groupBy?: unknown })
      .groupBy;
    const originalObjectGroupBy = (Object as unknown as { groupBy?: unknown })
      .groupBy;
    (Map as unknown as { groupBy?: unknown }).groupBy = undefined;
    (Object as unknown as { groupBy?: unknown }).groupBy = undefined;
    try {
      const resources = Array.from({ length: 5 }, (_, index) =>
        resource(String(index).padStart(4, '0')),
      );
      expect(buildPartitions(resources).length).toBeGreaterThan(0);
    } finally {
      (Map as unknown as { groupBy?: unknown }).groupBy = originalMapGroupBy;
      (Object as unknown as { groupBy?: unknown }).groupBy =
        originalObjectGroupBy;
    }
  });
});
