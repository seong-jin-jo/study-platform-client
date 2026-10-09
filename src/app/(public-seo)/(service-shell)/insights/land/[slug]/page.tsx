import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIslandForSeoBySlug } from '@/api/endpoints/seo/insight-seo.server';
import IslandArticleList from '@/app/(service)/insights/ui/island-article-list';
import { JsonLd } from '@/components/common/seo/json-ld';
import PublicSeoHead from '@/components/common/seo/public-seo-head';
import SeoHydrationBoundary from '@/features/seo/ui/seo-hydration-boundary';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const island = await getIslandForSeoBySlug(slug);
  if (!island) notFound();
  const description = `${island.name} 개척지의 개념글 ${island.articles.length}편을 물길 순서대로 이어 읽습니다.`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: island.name,
    description: `${island.name} 개척지 개념글 ${island.articles.length}편`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: island.articles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: article.title,
        url: `https://www.zeroone.it.kr/insights/${article.slug}`,
      })),
    },
  };
  const summary = (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-400 px-300 py-500 sm:px-400">
      <JsonLd data={schema} />
      <header>
        <h1 className="font-designer-32b text-text-strong">{island.name}</h1>
        <p className="font-designer-16r text-text-subtle">
          개념글 {island.articles.length}편을 이어 읽습니다.
        </p>
      </header>
      <ol className="flex flex-col gap-200">
        {island.articles.map((article) => (
          <li key={article.documentId}>
            <article>
              <h2 className="font-designer-20b text-text-strong">
                <Link href={`/insights/${article.slug}`}>{article.title}</Link>
              </h2>
              <p className="font-designer-14r text-text-subtle">
                {article.description}
              </p>
              <span>
                {article.accessLevel === 'LOCKED'
                  ? '미리보기 공개'
                  : '읽기 가능'}
              </span>
            </article>
          </li>
        ))}
      </ol>
    </main>
  );

  return (
    <>
      <PublicSeoHead
        title={`${island.name} 개척지 | ZERO ONE IT`}
        description={description}
        canonical={`https://www.zeroone.it.kr/insights/land/${slug}`}
      />
      <SeoHydrationBoundary
        serverSummary={summary}
        interactive={<IslandArticleList slug={slug} />}
      />
    </>
  );
}
