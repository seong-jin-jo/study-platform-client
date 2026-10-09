import { Metadata } from 'next';
import InsightLearningMap from '@/components/insights/insight-learning-map';
import Link from 'next/link';
import {
  getInsightMapForSeo,
  getKoansForSeo,
} from '@/api/endpoints/seo/insight-seo.server';
import SeoHydrationBoundary from '@/features/seo/ui/seo-hydration-boundary';
import { JsonLd } from '@/components/common/seo/json-ld';
import { generateMetadata as generateSEOMetadata } from '@/utils/seo';

export const metadata: Metadata = generateSEOMetadata({
  title: '인사이트 학습지도',
  description:
    '막힌 지점에 지도가 있습니다. 바이브코딩하다 걸리는 개념을 원리부터, 개발자가 아닌 사람 기준으로 풀어 씁니다.',
  path: '/insights',
  keywords: [
    '개발 인사이트',
    '기술 블로그',
    '면접 팁',
    '커리어',
    '개발자 성장',
    '기술 동향',
  ],
  canonicalUrl: 'https://www.zeroone.it.kr/insights',
});

export default async function BlogPage() {
  const [islands, koans] = await Promise.all([
    getInsightMapForSeo(),
    getKoansForSeo(undefined, 7),
  ]);
  const items = [
    ...islands.map((island) => ({
      name: island.name,
      url: `/insights/land/${island.slug}`,
    })),
    ...koans.items.map((koan) => ({
      name: koan.question,
      url: `/insights/koans/${koan.koanId}`,
    })),
  ];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ZERO ONE IT 인사이트 학습지도',
    description: '활성 개척지와 화두를 이어 읽는 학습지도',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: `https://www.zeroone.it.kr${item.url}`,
      })),
    },
  };
  const summary = (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-400 px-300 py-500 sm:px-400">
      <JsonLd data={schema} />
      <header className="flex flex-col gap-100">
        <h1 className="font-designer-32b text-text-strong">
          ZERO ONE IT 인사이트 학습지도
        </h1>
        <p className="font-designer-16r text-text-subtle">
          주제별 개척지와 오늘의 화두를 이어 읽으세요.
        </p>
      </header>
      <section className="flex flex-col gap-150">
        <h2 className="font-designer-24b text-text-strong">활성 개척지</h2>
        {islands.map((island) => (
          <article key={island.islandId}>
            <h3 className="font-designer-18b text-text-strong">
              <Link href={`/insights/land/${island.slug}`}>{island.name}</Link>
            </h3>
            <p className="font-designer-14r text-text-subtle">
              개념글 {island.articles.length}편
            </p>
          </article>
        ))}
      </section>
      <section className="flex flex-col gap-150">
        <h2 className="font-designer-24b text-text-strong">최근 화두</h2>
        {koans.items.map((koan) => (
          <Link key={koan.koanId} href={`/insights/koans/${koan.koanId}`}>
            {koan.question}
          </Link>
        ))}
      </section>
    </main>
  );
  return (
    <SeoHydrationBoundary
      serverSummary={summary}
      interactive={<InsightLearningMap />}
    />
  );
}
