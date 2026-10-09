import { notFound } from 'next/navigation';
import { getCommunitySeoDocumentInServer } from '@/api/endpoints/community/community-seo.server';
import { JsonLd } from '@/components/common/seo/json-ld';
import PublicSeoHead from '@/components/common/seo/public-seo-head';
import {
  normalizeCommunityBoardParam,
  normalizeCommunityPageParam,
} from '@/features/community/model/community-route';
import CommunityDetailPageClient from '@/features/community/ui/pages/community-detail-page-client';

interface CommunityDetailPageProps {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{
    page?: string | string[];
    board?: string | string[];
  }>;
}

const parsePostId = (rawPostId: string) => {
  const normalizedPostId = Number(rawPostId);

  return Number.isInteger(normalizedPostId) && normalizedPostId > 0
    ? normalizedPostId
    : undefined;
};

export default async function CommunityDetailPage({
  params,
  searchParams,
}: CommunityDetailPageProps) {
  const { postId: rawPostId } = await params;
  const { page, board } = await searchParams;
  const normalizedPostId = parsePostId(rawPostId);

  if (!normalizedPostId) {
    notFound();
  }

  const seoDocument = await getCommunitySeoDocumentInServer(normalizedPostId);
  if (!seoDocument) notFound();
  const canonicalUrl = `https://www.zeroone.it.kr${seoDocument.canonicalPath}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type':
      seoDocument.accessMode === 'FULL' ? 'DiscussionForumPosting' : 'WebPage',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    headline: seoDocument.title,
    description: seoDocument.publicSummaryText,
    datePublished: seoDocument.publishedAt,
    dateModified: seoDocument.updatedAt,
    isAccessibleForFree: seoDocument.accessMode === 'FULL',
    ...(seoDocument.accessMode === 'FULL'
      ? {
          text: seoDocument.publicBodyHtml.replace(/<[^>]+>/g, ' '),
          commentCount: seoDocument.commentCount,
        }
      : { abstract: seoDocument.publicSummaryText }),
    author: {
      '@type': 'Person',
      name: seoDocument.author.nickname,
      ...(seoDocument.author.canonicalPath
        ? {
            url: `https://www.zeroone.it.kr${seoDocument.author.canonicalPath}`,
          }
        : {}),
    },
  };

  return (
    <>
      <PublicSeoHead
        title={`${seoDocument.title} | ZERO ONE IT`}
        description={seoDocument.publicSummaryText}
        canonical={canonicalUrl}
        ogType="article"
        publishedTime={seoDocument.publishedAt}
        modifiedTime={seoDocument.updatedAt}
      />
      <CommunityDetailPageClient
        postId={normalizedPostId}
        returnPage={normalizeCommunityPageParam(page)}
        returnBoard={normalizeCommunityBoardParam(board)}
        initialSeoPreview={{
          postId: seoDocument.postId,
          title: seoDocument.title,
          previewText: seoDocument.publicSummaryText,
          author: seoDocument.author,
          sourceRoom: seoDocument.sourceRoom,
          publishedAt: seoDocument.publishedAt,
          accessMode: seoDocument.accessMode,
          ...(seoDocument.accessMode === 'FULL'
            ? { publicBodyHtml: seoDocument.publicBodyHtml }
            : {}),
        }}
      />
      <JsonLd data={structuredData} />
    </>
  );
}
