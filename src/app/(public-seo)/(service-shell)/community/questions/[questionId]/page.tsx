import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getQuestionSeoDocumentInServer } from '@/api/endpoints/community/community-seo.server';
import { JsonLd } from '@/components/common/seo/json-ld';
import PublicSeoHead from '@/components/common/seo/public-seo-head';
import PageContainer from '@/components/common/ui/page-container';
import {
  normalizeCommunityBoardParam,
  normalizeCommunityPageParam,
} from '@/features/community/model/community-route';
import CommunityQnaDetailPageClient from '@/features/community/ui/pages/community-qna-detail-page-client';
import SeoHydrationBoundary from '@/features/seo/ui/seo-hydration-boundary';
import { stripHtml } from '@/utils/markdown-content-text';

interface CommunityQuestionDetailPageProps {
  params: Promise<{ questionId: string }>;
  searchParams: Promise<{
    board?: string | string[];
    page?: string | string[];
    answerPage?: string | string[];
    commentPage?: string | string[];
  }>;
}

const parseQuestionId = (rawQuestionId: string) => {
  const normalizedQuestionId = Number(rawQuestionId);

  return Number.isInteger(normalizedQuestionId) && normalizedQuestionId > 0
    ? normalizedQuestionId
    : undefined;
};

export default async function CommunityQuestionDetailPage({
  params,
  searchParams,
}: CommunityQuestionDetailPageProps) {
  const { questionId: rawQuestionId } = await params;
  const { board, page, answerPage, commentPage } = await searchParams;
  const normalizedQuestionId = parseQuestionId(rawQuestionId);

  if (!normalizedQuestionId) {
    notFound();
  }

  const document = await getQuestionSeoDocumentInServer(normalizedQuestionId);
  if (!document) notFound();

  const answers = [document.acceptedAnswer, ...document.answers].filter(
    (answer): answer is NonNullable<typeof answer> =>
      answer !== null && answer !== undefined,
  );
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: document.title,
      text: stripHtml(document.contentHtml),
      answerCount: document.answerCount,
      datePublished: document.createdAt,
      dateModified: document.updatedAt,
      author: {
        '@type': 'Person',
        name: document.author.name,
        ...(document.author.canonicalPath
          ? { url: `https://www.zeroone.it.kr${document.author.canonicalPath}` }
          : {}),
      },
      ...(document.acceptedAnswer
        ? {
            acceptedAnswer: {
              '@type': 'Answer',
              text: stripHtml(document.acceptedAnswer.contentHtml),
              datePublished: document.acceptedAnswer.createdAt,
              url: `https://www.zeroone.it.kr${document.canonicalPath}#answer-${document.acceptedAnswer.answerId}`,
              author: {
                '@type': 'Person',
                name: document.acceptedAnswer.author.name,
              },
            },
          }
        : {}),
      suggestedAnswer: document.answers.map((answer) => ({
        '@type': 'Answer',
        text: stripHtml(answer.contentHtml),
        datePublished: answer.createdAt,
        url: `https://www.zeroone.it.kr${document.canonicalPath}#answer-${answer.answerId}`,
        author: { '@type': 'Person', name: answer.author.name },
      })),
    },
  };

  const serverSummary = (
    <PageContainer className="flex flex-col gap-400 xl:gap-500">
      <JsonLd data={schema} />
      <article className="flex flex-col gap-300">
        <header className="flex flex-col gap-200 border-b border-border-default pb-300">
          <Link
            href="/community"
            className="font-designer-14m text-text-subtle hover:text-text-default inline-flex w-fit items-center gap-75"
          >
            <span aria-hidden="true">‹</span>
            커뮤니티로 돌아가기
          </Link>
          <span className="font-designer-12b bg-fill-static-default text-text-subtle mt-200 w-fit rounded-full px-100 py-50">
            묻고 답하기
          </span>
          <h1 className="font-designer-32b text-text-strong">
            {document.title}
          </h1>
          <div className="font-designer-14r text-text-subtle flex min-h-750 flex-wrap content-start items-center gap-100">
            <span className="font-designer-14m text-text-default">
              {document.author.name}
            </span>
            <span className="rounded-full bg-fill-brand-subtle-default px-100 py-50 font-designer-12b text-text-brand">
              {document.acceptedAnswer ? '채택 완료' : '답변 대기'}
            </span>
            <span className="text-text-subtlest">·</span>
            <span>
              {new Date(document.createdAt).toLocaleDateString('ko-KR')}
            </span>
            <span className="text-text-subtlest">·</span>
            <span>답변 {document.answerCount}</span>
          </div>
        </header>
        <div dangerouslySetInnerHTML={{ __html: document.contentHtml }} />
      </article>
      <section className="flex flex-col gap-300" aria-label="답변">
        <h2 className="font-designer-24b text-text-strong">
          답변 {document.answerCount}개
        </h2>
        {answers.map((answer) => (
          <article
            key={answer.answerId}
            id={`answer-${answer.answerId}`}
            className="flex flex-col gap-150 border-b border-border-subtle pb-250"
          >
            <p className="font-designer-14m text-text-default">
              {answer.author.name}
            </p>
            <div dangerouslySetInnerHTML={{ __html: answer.contentHtml }} />
          </article>
        ))}
      </section>
    </PageContainer>
  );

  return (
    <>
      <PublicSeoHead
        title={`${document.title} | ZERO ONE IT`}
        description={document.excerpt}
        canonical={`https://www.zeroone.it.kr${document.canonicalPath}`}
        ogType="article"
        publishedTime={document.createdAt}
        modifiedTime={document.updatedAt}
      />
      <SeoHydrationBoundary
        waitForInteractiveReady
        serverSummary={serverSummary}
        interactive={
          <CommunityQnaDetailPageClient
            questionId={normalizedQuestionId}
            returnPage={normalizeCommunityPageParam(page)}
            returnBoard={normalizeCommunityBoardParam(board)}
            initialAnswerPage={normalizeCommunityPageParam(answerPage)}
            initialCommentPage={normalizeCommunityPageParam(commentPage)}
          />
        }
      />
    </>
  );
}
