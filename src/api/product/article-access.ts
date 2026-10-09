import 'server-only';

import qs from 'qs';
import { cache } from 'react';
import {
  strapiFetch,
  strapiFetchNoStore,
  type StrapiCollectionResponse,
} from '@/api/strapi/api/common-strapi-fetch';
import {
  fetchArticles,
  fetchCategories,
} from '@/api/strapi/api/fetch-articles';
import {
  toAbsoluteMediaUrl,
  toRenderableArticle,
} from '@/api/strapi/api/media-url';
import type {
  ArticleTeaser,
  RenderableArticle,
  StrapiArticle,
} from '@/types/insights/article';

interface ProductEnvelope<T> {
  code: string;
  message?: string;
  traceId?: string;
  data: T;
}

interface ArticleAccessPayload extends ArticleTeaser {
  accessMode: 'PUBLIC_FULL' | 'UNLOCKED' | 'LOCKED';
  // 배포 창(프론트가 백엔드보다 먼저 나가는 구간)에서만 내려오는 구 필드다.
  // 계약 v1.0.12 의 정본은 accessMode 이고, 이 값은 폴백으로만 읽는다.
  accessLevel?: 'FREE' | 'UNLOCKED' | 'LOCKED';
  authDegraded?: boolean;
}

// 알 수 없는 값은 전부 LOCKED 로 접는다. 공개 본문은 PUBLIC_FULL 과
// 구 FREE 에서만 나오고, 두 필드가 모두 비면 잠긴 것으로 판정한다.
const resolveAccessMode = (
  access: ArticleAccessPayload,
): 'PUBLIC_FULL' | 'UNLOCKED' | 'LOCKED' => {
  if (access.accessMode) return access.accessMode;
  if (access.accessLevel === 'FREE') return 'PUBLIC_FULL';
  if (access.accessLevel === 'UNLOCKED') return 'UNLOCKED';
  return 'LOCKED';
};

export type AccessResult =
  | {
      state: 'FREE' | 'UNLOCKED';
      authDegraded: boolean;
      meta: ArticleTeaser;
      fetchBody: () => Promise<RenderableArticle>;
    }
  | {
      state: 'LOCKED';
      authDegraded: boolean;
      teaser: ArticleTeaser;
    };

export class ArticleAccessError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`Article access failed: ${status} ${code}`);
  }
}

interface SitemapArticle {
  slug: string;
  updatedAt: string;
}

const fetchArticleBodyByDocumentId = cache(
  async (documentId: string): Promise<RenderableArticle> => {
    const query = qs.stringify(
      {
        filters: { documentId: { $eq: documentId } },
        populate: {
          category: true,
          cover: true,
          author: { populate: ['avatar'] },
          blocks: { populate: '*' },
        },
      },
      { encodeValuesOnly: true },
    );
    const response = await strapiFetchNoStore<
      StrapiCollectionResponse<StrapiArticle>
    >(`/api/articles?${query}`);
    const article = response.data.find(
      (candidate) => candidate.documentId === documentId,
    );

    if (!article) {
      throw new Error(`Strapi article body not found: ${documentId}`);
    }

    return toRenderableArticle(article);
  },
);

export const fetchPublicArticleBodyByDocumentId = cache(
  async (documentId: string): Promise<RenderableArticle> => {
    const article = await fetchArticleBodyByDocumentId(documentId);
    if (!article.author) return article;
    const { email, ...publicAuthor } = article.author;
    return email === undefined ? article : { ...article, author: publicAuthor };
  },
);

const fetchSitemapArticlePage = async (page: number) => {
  const query = new URLSearchParams();
  query.append('fields[0]', 'slug');
  query.append('fields[1]', 'updatedAt');
  query.append('sort', 'updatedAt:desc');
  query.append('pagination[page]', String(page));
  query.append('pagination[pageSize]', '100');

  return strapiFetch<StrapiCollectionResponse<SitemapArticle>>(
    `/api/articles?${query.toString()}`,
  );
};

export async function fetchPublicSitemapCatalog(): Promise<SitemapArticle[]> {
  const firstPage = await fetchSitemapArticlePage(1);
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.meta.pagination.pageCount - 1) },
      (_, index) => fetchSitemapArticlePage(index + 2),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

export async function fetchPublicArticleCatalog(categorySlug?: string) {
  const [categoriesResponse, articlesResponse] = await Promise.all([
    fetchCategories(),
    fetchArticles({ categorySlug }),
  ]);

  return {
    categories: (categoriesResponse.data ?? []).map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
    articles: (articlesResponse.data ?? []).map((article) => ({
      documentId: article.documentId,
      slug: article.slug,
      title: article.title,
      description: article.description,
      publishedAt: article.publishedAt,
      category: article.category
        ? { name: article.category.name, slug: article.category.slug }
        : undefined,
      cover: article.cover
        ? {
            url: toAbsoluteMediaUrl(article.cover.url) ?? article.cover.url,
            alternativeText: article.cover.alternativeText,
          }
        : undefined,
    })),
  };
}

const callArticleAccess = async (
  slug: string,
  accessToken?: string,
): Promise<ArticleAccessPayload> => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');

  if (!apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is required.');
  }

  const response = await fetch(
    `${apiBaseUrl}/api/v2/insight/articles/by-slug/${encodeURIComponent(slug)}/access`,
    {
      cache: 'no-store',
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    },
  );
  const envelope = (await response.json()) as Partial<
    ProductEnvelope<ArticleAccessPayload>
  >;

  if (!response.ok || !envelope.data) {
    throw new ArticleAccessError(response.status, envelope.code ?? 'UNKNOWN');
  }

  return envelope.data;
};

export const resolveArticleAccess = cache(
  async (slug: string, accessToken?: string): Promise<AccessResult> => {
    let access: ArticleAccessPayload;
    let authDegraded = false;

    try {
      access = await callArticleAccess(slug, accessToken);
    } catch (error) {
      if (!(error instanceof ArticleAccessError) || error.status !== 401) {
        throw error;
      }

      access = await callArticleAccess(slug);
      authDegraded = true;
    }

    const meta: ArticleTeaser = {
      documentId: access.documentId,
      slug: access.slug,
      title: access.title,
      islandId: access.islandId,
      islandSlug: access.islandSlug,
      islandName: access.islandName,
      ordinal: access.ordinal,
      teaser: access.teaser,
      coverUrl: access.coverUrl,
      unlockCost: access.unlockCost,
      accessReason: access.accessReason,
      budget: access.budget,
      freeAlternative: access.freeAlternative,
    };

    const accessMode = resolveAccessMode(access);

    if (accessMode === 'LOCKED') {
      return {
        state: 'LOCKED',
        authDegraded: authDegraded || Boolean(access.authDegraded),
        teaser: meta,
      };
    }

    const documentId = access.documentId;

    return {
      state: accessMode === 'PUBLIC_FULL' ? 'FREE' : 'UNLOCKED',
      authDegraded: authDegraded || Boolean(access.authDegraded),
      meta,
      fetchBody: () => fetchArticleBodyByDocumentId(documentId),
    };
  },
);
