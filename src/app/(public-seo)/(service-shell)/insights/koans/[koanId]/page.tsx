import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { getKoanForSeo } from '@/api/endpoints/seo/insight-seo.server';
import KoanDetail from '@/app/(service)/insights/ui/koan-detail';
import { JsonLd } from '@/components/common/seo/json-ld';
import PublicSeoHead from '@/components/common/seo/public-seo-head';
import SeoHydrationBoundary from '@/features/seo/ui/seo-hydration-boundary';

export default async function Page({
  params,
}: {
  params: Promise<{ koanId: string }>;
}) {
  const { koanId } = await params;
  const id = Number(koanId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const koan = await getKoanForSeo(id);
  if (!koan) notFound();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: koan.question,
      text: koan.conceptSummary,
      answerCount: Math.max(1, koan.answerCount),
      dateCreated: koan.publishedAt,
      acceptedAnswer: {
        '@type': 'Answer',
        text: koan.modelAnswerMd,
        dateCreated: koan.publishedAt,
        url: `https://www.zeroone.it.kr/insights/koans/${id}#model-answer`,
        author: { '@type': 'Organization', name: 'ZERO ONE IT' },
      },
    },
  };
  const summary = (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-400 px-300 py-500 sm:px-400">
      <JsonLd data={schema} />
      <article>
        <header>
          <h1 className="font-designer-32b text-text-strong">
            {koan.question}
          </h1>
          <p className="font-designer-16r text-text-subtle">
            {koan.conceptSummary}
          </p>
        </header>
        <section id="model-answer">
          <h2 className="font-designer-24b text-text-strong">
            이 물음에 대한 답
          </h2>
          <ReactMarkdown>{koan.modelAnswerMd}</ReactMarkdown>
        </section>
      </article>
    </main>
  );

  return (
    <>
      <PublicSeoHead
        title={`${koan.question} | ZERO ONE IT`}
        description={koan.conceptSummary}
        canonical={`https://www.zeroone.it.kr/insights/koans/${id}`}
        ogType="article"
        publishedTime={koan.publishedAt}
      />
      <SeoHydrationBoundary
        serverSummary={summary}
        interactive={<KoanDetail koanId={id} />}
      />
    </>
  );
}
