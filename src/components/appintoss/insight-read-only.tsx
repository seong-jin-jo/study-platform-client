'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getAppintossArticleAccess,
  getAppintossArticleBody,
} from '@/api/client/appintoss-public-api';
import BlogDetailPage from '@/app/(service)/insights/ui/blog-detail-page';
import KoanDetail from '@/app/(service)/insights/ui/koan-detail';
import type {
  ArticleTeaser,
  RenderableArticle,
} from '@/types/insights/article';
import { sanitizeAppintossArticleHtml } from './appintoss-html-sanitizer';

const APPINTOSS_ARTICLE_QUERY_STALE_TIME = 60_000;

export default function InsightReadOnly({
  id,
  kind,
  slug,
}: {
  id?: number;
  kind?: string;
  slug?: string;
}) {
  const articleQuery = useQuery({
    queryKey: ['appintoss', 'insight', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Missing insight slug');
      const access = await getAppintossArticleAccess(slug);
      if (access.access !== 'PUBLIC') {
        throw new Error(
          'App-in-Toss first release only renders public articles',
        );
      }

      const body = await getAppintossArticleBody(slug);
      if (body.accessProof !== 'PUBLIC') {
        throw new Error('App-in-Toss article body lacks public access proof');
      }

      return {
        access,
        body: {
          ...body,
          bodyHtml: sanitizeAppintossArticleHtml(body.bodyHtml),
        },
      };
    },
    enabled: kind !== 'koan' && Boolean(slug),
    retry: false,
    staleTime: APPINTOSS_ARTICLE_QUERY_STALE_TIME,
  });

  if (kind === 'koan' && id) {
    return <KoanDetail koanId={id} readOnly />;
  }

  if (!slug || articleQuery.isError) {
    return (
      <section className="mx-auto max-w-9250 px-300 py-800" role="alert">
        <h1 className="font-designer-28b text-text-strong">
          인사이트를 불러오지 못했어요
        </h1>
        <p className="mt-125 font-designer-16r text-text-subtle">
          공개되지 않았거나 아직 앱 읽기를 지원하지 않는 글입니다.
        </p>
      </section>
    );
  }

  if (!articleQuery.data) {
    return (
      <output
        className="mx-auto min-h-2000 max-w-9250 animate-pulse bg-background-disabled"
        aria-label="인사이트를 불러오는 중"
      />
    );
  }

  const { access, body } = articleQuery.data;
  const accessMeta: ArticleTeaser = {
    accessReason: access.firstFree ? 'FIRST_ARTICLE' : 'ALREADY_UNLOCKED',
    budget: null,
    coverUrl: null,
    documentId: access.documentId,
    freeAlternative: null,
    islandId: 0,
    islandName: '인사이트',
    islandSlug: 'all',
    ordinal: 1,
    slug: access.slug,
    teaser: access.excerpt,
    title: access.title,
    unlockCost: 0,
  };
  const article: RenderableArticle = {
    author: { name: 'ZERO-ONE 편집팀' },
    blocks: [{ __component: 'shared.rich-text', body: body.bodyHtml }],
    category: { name: '인사이트', slug: 'all' },
    description: access.excerpt,
    documentId: body.documentId,
    publishedAt: '',
    slug: access.slug,
    title: body.title,
    updatedAt: '',
  };

  return (
    <BlogDetailPage
      accessMeta={accessMeta}
      article={article}
      authDegraded={false}
      readOnly
    />
  );
}
