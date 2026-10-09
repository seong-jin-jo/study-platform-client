import { notFound } from 'next/navigation';
import { getArticleForSeo } from '@/api/endpoints/seo/insight-seo.server';
import {
  ArticleAccessError,
  fetchPublicArticleBodyByDocumentId,
  resolveArticleAccess,
} from '@/api/product/article-access';
import BlogDetailPage from '@/app/(service)/insights/ui/blog-detail-page';
import GatedArticleClient from '@/app/(service)/insights/ui/gated-article-client';
import { JsonLd } from '@/components/common/seo/json-ld';
import { ArticleViewTracker } from '@/components/insights/insight-core-event-trackers';
import PublicSeoHead from '@/components/common/seo/public-seo-head';
import {
  accessSnapshotMatches as isAccessSnapshotMatching,
  mayRenderPublicBody,
} from './insight-ssr-access';

const SITE_ORIGIN = 'https://www.zeroone.it.kr';

const getDocument = async (slug: string) => {
  const document = await getArticleForSeo(slug);
  if (!document) notFound();
  return document;
};

export default async function InsightArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 없는 글이면 접근 조회가 404 를 예외로 던진다. 그대로 두면 페이지가 500 이 된다
  // (같은 조건에서 개척지·화두·커뮤니티글·질문·방·프로필은 모두 404 를 낸다.
  //  이 경로만 500 이었다). 크롤러에게 500 은 "우리 잘못"이라 재방문 대상이 되고,
  //  404 는 "그 주소는 없다"라 정확한 신호다. 404 로 맞춘다.
  const [document, publicAccess] = await Promise.all([
    getDocument(id),
    resolveArticleAccess(id).catch((error) => {
      if (error instanceof ArticleAccessError && error.status === 404) {
        notFound();
      }
      throw error;
    }),
  ]);
  const teaser =
    publicAccess.state === 'LOCKED' ? publicAccess.teaser : publicAccess.meta;
  if (teaser.documentId !== document.documentId) notFound();
  const livePublicFree = publicAccess.state === 'FREE';
  const accessSnapshotMatches = isAccessSnapshotMatching(
    document.isAccessibleForFree,
    publicAccess.state,
  );
  const publicBodyAllowed = mayRenderPublicBody(
    document.isAccessibleForFree,
    publicAccess.state,
  );
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: document.title,
    description: document.publicSummary,
    abstract: document.publicSummary,
    url: `${SITE_ORIGIN}${document.canonicalPath}`,
    dateModified: document.updatedAt,
    isAccessibleForFree: livePublicFree && accessSnapshotMatches,
    ...(document.coverUrl ? { image: document.coverUrl } : {}),
    author: {
      '@type': document.author.canonicalPath ? 'Person' : 'Organization',
      name: document.author.name,
      ...(document.author.canonicalPath
        ? { url: `${SITE_ORIGIN}${document.author.canonicalPath}` }
        : {}),
    },
  };

  // CMS 실패와 blocks 0은 정상 본문이 아니다. 200 으로 빈 화면을 주지 않고 오류로 올려
  // ingress 가 no-store·noindex 503 으로 매핑하게 한다.
  // blocks 는 계약상 optional 이므로 미정의와 0건을 같은 degraded 로 판정한다.
  const publicBody =
    publicBodyAllowed && accessSnapshotMatches
      ? await fetchPublicArticleBodyByDocumentId(document.documentId)
      : null;
  if (publicBody && (publicBody.blocks?.length ?? 0) === 0) {
    throw new Error(`CMS article has no public blocks: ${document.documentId}`);
  }
  const content =
    publicBodyAllowed && accessSnapshotMatches && publicBody ? (
      <BlogDetailPage
        article={publicBody}
        accessMeta={teaser}
        authDegraded={false}
      />
    ) : (
      <GatedArticleClient teaser={teaser} />
    );

  return (
    <>
      <ArticleViewTracker
        accessState={
          livePublicFree && accessSnapshotMatches ? 'FREE' : 'LOCKED'
        }
        articleSlug={document.canonicalPath.replace('/insights/', '')}
        islandSlug={document.island.slug}
      />
      <PublicSeoHead
        title={`${document.title} | ZERO ONE IT`}
        description={document.publicSummary}
        canonical={`${SITE_ORIGIN}${document.canonicalPath}`}
        ogType="article"
        image={document.coverUrl}
        modifiedTime={document.updatedAt}
      />
      {content}
      <JsonLd data={schema} />
    </>
  );
}
