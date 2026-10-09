import type { Metadata } from 'next';
import Link from 'next/link';
import { getKoansForSeo } from '@/api/endpoints/seo/insight-seo.server';
import KoanList from '@/app/(service)/insights/ui/koan-list';
import { JsonLd } from '@/components/common/seo/json-ld';
import SeoHydrationBoundary from '@/features/seo/ui/seo-hydration-boundary';

export const metadata: Metadata = {
  title: '화두 | ZERO ONE IT',
  description: '정답이 정해지지 않은 물음을 읽고 내 경험으로 보완합니다.',
  alternates: { canonical: 'https://www.zeroone.it.kr/insights/koans' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    title: '화두 | ZERO ONE IT',
    description: '정답이 정해지지 않은 물음을 읽고 내 경험으로 보완합니다.',
    url: 'https://www.zeroone.it.kr/insights/koans',
    siteName: 'ZERO ONE IT',
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const page = await getKoansForSeo(category, 100);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '화두',
    description: '정답이 정해지지 않은 물음을 읽고 내 경험으로 보완합니다.',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: page.items.map((koan, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: koan.question,
        url: `https://www.zeroone.it.kr/insights/koans/${koan.koanId}`,
      })),
    },
  };
  const summary = (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-400 px-300 py-500 sm:px-400">
      <JsonLd data={schema} />
      <header>
        <h1 className="font-designer-32b text-text-strong">화두</h1>
        <p className="font-designer-16r text-text-subtle">
          정답이 정해지지 않은 물음을 읽고 내 경험으로 보완합니다.
        </p>
      </header>
      <section className="flex flex-col gap-200">
        {page.items.map((koan) => (
          <article key={koan.koanId}>
            <h2 className="font-designer-20b text-text-strong">
              <Link href={`/insights/koans/${koan.koanId}`}>
                {koan.question}
              </Link>
            </h2>
            <p className="font-designer-14r text-text-subtle">
              {koan.categoryName} · 보완 {koan.answerCount}건
            </p>
          </article>
        ))}
      </section>
    </main>
  );

  return (
    <SeoHydrationBoundary
      serverSummary={summary}
      interactive={<KoanList categorySlug={category} />}
    />
  );
}
