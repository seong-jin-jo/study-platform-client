import 'server-only';

import { cache } from 'react';
import type { InsightIsland, InsightMap } from '@/types/insight-worldmap';
import type { KoanDetail, KoanPage } from '@/types/insights/koan';

interface Envelope<T> {
  data?: T;
  content?: T;
}

export interface InsightArticleSeoDocument {
  resourceType: 'ARTICLE';
  documentId: string;
  canonicalPath: string;
  title: string;
  publicSummary: string;
  coverUrl: string | null;
  author: { name: string; canonicalPath: string | null };
  updatedAt: string;
  isAccessibleForFree: boolean;
  bodyAccess: 'PUBLIC_FIRST_ARTICLE' | 'LOGIN_AND_BUDGET';
  island: { id: number; slug: string; name: string };
}

export interface InsightSitemapResource {
  type: 'ARTICLE' | 'ISLAND' | 'KOAN';
  resourceKey: string;
  canonicalPath: string;
  updatedAt: string;
}

interface InsightSitemapResourcePage {
  items: InsightSitemapResource[];
  nextCursor: string | null;
  snapshot: string;
  datasetTotalItems: number;
  totalItems: number;
}

interface InsightSitemapOptions {
  types?: string;
  partitionStartExclusive?: string;
  partitionEndInclusive?: string;
}

const apiBase = () => {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!value) throw new Error('NEXT_PUBLIC_API_BASE_URL is required');
  return value;
};

// 인사이트 지도/섬/화두/아티클은 로그인 여부와 무관하게 모두에게 같은 내용을 보여주는
// 공개 SEO 문서다(호출부는 (public-seo) 라우트 그룹뿐, Authorization/쿠키를 전달하지 않는다).
// 분 단위로 바뀌는 데이터가 아니므로 60초 재검증으로 백엔드 왕복을 줄인다.
// (인사이트 목록/상세 문서 응답 p95 800ms 기준 FAIL 대응, 2026-08-24)
// e2e 픽스처 러너는 상류 상태를 바꾸고 곧바로 결과를 단언한다. 60초 창이 살아
// 있으면 앱이 옛 응답을 돌려줘 그 단언이 실제 동작이 아니라 캐시를 검사하게 된다.
// 그래서 러너만 이 값을 0 으로 내린다(SEO_DOCUMENT_REVALIDATE_SECONDS=0).
// 값을 안 주면 운영과 같은 60초다.
const SEO_DOCUMENT_REVALIDATE_SECONDS = (() => {
  const raw = process.env.SEO_DOCUMENT_REVALIDATE_SECONDS?.trim();
  if (!raw) return 60;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 60;
})();

const publicGet = async <T>(path: string): Promise<T | undefined> => {
  const response = await fetch(`${apiBase()}${path}`, {
    next: { revalidate: SEO_DOCUMENT_REVALIDATE_SECONDS },
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404 || response.status === 410) return undefined;
  if (!response.ok)
    throw new Error(`Public insight API failed: ${response.status}`);
  const envelope = (await response.json()) as Envelope<T>;
  const value = envelope.data ?? envelope.content;
  if (!value)
    throw new Error('Public insight API returned a malformed envelope');
  return value;
};

export const getInsightMapForSeo = cache(async () => {
  const map = await publicGet<InsightMap>('/api/v1/insight/map');
  if (!map) throw new Error('Insight map is unavailable');
  return map.islands;
});

export const getIslandForSeoBySlug = cache(async (slug: string) => {
  const islands = await getInsightMapForSeo();
  const summary = islands.find((island) => island.slug === slug);
  if (!summary) return undefined;
  return publicGet<InsightIsland>(
    `/api/v1/insight/islands/${summary.islandId}`,
  );
});

export const getKoansForSeo = cache(
  async (categorySlug?: string, size = 100): Promise<KoanPage> => {
    const search = new URLSearchParams({ page: '1', size: String(size) });
    if (categorySlug) search.set('categorySlug', categorySlug);
    const page = await publicGet<KoanPage>(`/api/v1/koans?${search}`);
    if (!page) throw new Error('Koan list is unavailable');
    return page;
  },
);

export const getKoanForSeo = cache(async (koanId: number) =>
  publicGet<KoanDetail>(`/api/v1/koans/${koanId}`),
);

export const getArticleForSeo = cache(async (slug: string) =>
  publicGet<InsightArticleSeoDocument>(
    `/api/v1/insight/seo-documents/articles/${encodeURIComponent(slug)}`,
  ),
);

export const getInsightSitemapResourcesInServer = async (
  options: InsightSitemapOptions = {},
): Promise<InsightSitemapResource[]> => {
  const deadline = Date.now() + 10_000;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const resources: InsightSitemapResource[] = [];
    const paths = new Set<string>();
    const seenCursors = new Set<string>();
    let cursor: string | undefined;
    let snapshot: string | undefined;
    let expectedTotal: number | undefined;
    let restart = false;

    do {
      if (Date.now() >= deadline)
        throw new Error('Insight sitemap traversal timed out');
      const search = new URLSearchParams({
        types: options.types ?? 'ARTICLE,ISLAND,KOAN',
        size: '1000',
      });
      if (cursor) search.set('cursor', cursor);
      if (snapshot) search.set('snapshot', snapshot);
      if (options.partitionStartExclusive !== undefined) {
        search.set('partitionStartExclusive', options.partitionStartExclusive);
      }
      if (options.partitionEndInclusive !== undefined) {
        search.set('partitionEndInclusive', options.partitionEndInclusive);
      }
      const remaining = Math.max(1, deadline - Date.now());
      const response = await fetch(
        `${apiBase()}/api/v1/insight/sitemap-resources?${search}`,
        {
          // 사이트맵 순회는 커서/스냅샷 일관성이 생명이다(중간에 데이터가 바뀌면
          // 위 snapshot/nextCursor 검증이 즉시 예외를 던진다). 캐시를 걸면 페이지 사이에
          // 서로 다른 스냅샷이 섞여 중복/누락이 생길 수 있어 이 경로만 no-store로 둔다.
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(remaining),
        },
      );
      if (response.status === 409) {
        restart = true;
        break;
      }
      if (!response.ok) {
        throw new Error(`Insight sitemap API failed: ${response.status}`);
      }
      const envelope =
        (await response.json()) as Envelope<InsightSitemapResourcePage>;
      const page = envelope.data ?? envelope.content;
      if (!page || !Array.isArray(page.items) || !page.snapshot) {
        throw new Error('Insight sitemap API returned a malformed envelope');
      }
      if (snapshot && page.snapshot !== snapshot) {
        throw new Error('Insight sitemap snapshot changed during traversal');
      }
      expectedTotal ??= page.totalItems;
      if (page.totalItems !== expectedTotal) {
        throw new Error(
          'Insight sitemap signed total changed during traversal',
        );
      }
      for (const item of page.items) {
        if (paths.has(item.canonicalPath)) {
          throw new Error('Insight sitemap canonical path duplicate detected');
        }
        paths.add(item.canonicalPath);
        resources.push(item);
      }
      const nextCursor = page.nextCursor ?? undefined;
      if (nextCursor && seenCursors.has(nextCursor)) {
        throw new Error('Insight sitemap cursor cycle detected');
      }
      if (nextCursor) seenCursors.add(nextCursor);
      cursor = nextCursor;
      snapshot = page.snapshot;
      if (seenCursors.size > 10_000) {
        throw new Error('Insight sitemap page guard exceeded');
      }
    } while (cursor);

    if (restart) continue;
    if (resources.length !== expectedTotal) {
      throw new Error('Insight sitemap emitted count mismatch');
    }
    return resources;
  }
  throw new Error('Insight sitemap snapshot invalidated repeatedly');
};
