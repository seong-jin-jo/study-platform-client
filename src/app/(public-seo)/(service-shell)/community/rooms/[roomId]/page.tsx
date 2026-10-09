import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getRoomSeoDocumentInServer } from '@/api/endpoints/community/community-seo.server';
import { JsonLd } from '@/components/common/seo/json-ld';
import PublicSeoHead from '@/components/common/seo/public-seo-head';
import Button from '@/components/common/ui/button';
import PageContainer from '@/components/common/ui/page-container';
import CommunityRoomDetailPage from '@/components/community/pages/community-room-detail-page';
import SeoHydrationBoundary from '@/features/seo/ui/seo-hydration-boundary';

interface CommunityRoomPageProps {
  params: Promise<{ roomId: string }>;
}

const parseRoomId = (rawRoomId: string) => {
  const roomId = Number(rawRoomId);

  return Number.isInteger(roomId) && roomId > 0 ? roomId : undefined;
};

export default async function CommunityRoomPage({
  params,
}: CommunityRoomPageProps) {
  const { roomId: rawRoomId } = await params;
  const roomId = parseRoomId(rawRoomId);

  if (!roomId) notFound();

  const document = await getRoomSeoDocumentInServer(roomId);
  if (!document) notFound();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: document.name,
    description: document.description,
    url: `https://www.zeroone.it.kr${document.canonicalPath}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: document.posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: post.title,
        url: `https://www.zeroone.it.kr${post.canonicalPath}`,
      })),
    },
  };

  const serverSummary = (
    <PageContainer className="flex flex-col gap-150 sm:gap-200">
      <JsonLd data={schema} />
      <Link
        href="/community"
        className="font-designer-13b text-text-subtle hover:text-text-strong flex w-fit items-center gap-50"
      >
        <span aria-hidden="true">‹</span>방 목록
      </Link>
      <header className="border-border-subtle bg-background-default rounded-250 overflow-hidden border">
        {document.bannerUrl?.trim() ? (
          <div className="bg-background-disabled relative h-1250 sm:h-1750">
            <Image
              src={document.bannerUrl.trim()}
              alt={`${document.name} 배너`}
              fill
              sizes="100vw"
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
            <p className="font-designer-12b text-text-inverse absolute right-175 bottom-125 left-175 line-clamp-1 rounded-full bg-black/45 px-125 py-50 backdrop-blur-sm sm:right-auto">
              {document.description}
            </p>
          </div>
        ) : null}
        <div className="relative p-200 sm:p-250">
          <div className="flex flex-col gap-150 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-50 min-h-225" aria-hidden="true" />
              <h1 className="font-designer-28b text-text-strong">
                {document.name}
              </h1>
              {!document.bannerUrl?.trim() ? (
                <p className="font-designer-13r text-text-subtle mt-75 max-w-2xl">
                  {document.description}
                </p>
              ) : null}
            </div>
            <div className="min-h-1250 w-full shrink-0 sm:w-auto">
              <Button asChild color="primary" size="large">
                <a
                  href={`/login?callbackUrl=${encodeURIComponent(document.canonicalPath)}`}
                >
                  이 방에 정착하기
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <section className="flex flex-col gap-75" aria-label="공개 글 미리보기">
        <div className="border-border-subtle bg-background-default rounded-200 flex items-center border p-100">
          <h2 className="font-designer-14b text-text-strong">이 방의 이야기</h2>
        </div>
        {document.posts.length === 0 ? (
          <section className="border-border-subtle bg-background-default rounded-200 flex flex-col items-center gap-125 border p-400 text-center">
            <h3 className="font-designer-20b text-text-strong">
              아직 새 글이 없어요
            </h3>
            <p className="font-designer-14r text-text-subtle max-w-xl">
              첫 질문과 작업 기록이 이 방의 다음 대화를 시작해요.
            </p>
          </section>
        ) : (
          <div className="flex flex-col gap-300 lg:gap-400">
            {document.posts.slice(0, 3).map((post) => (
              <article
                key={post.postId}
                className="border-border-subtle bg-background-default rounded-200 flex min-h-1625 flex-col gap-75 border px-225 py-225"
              >
                <h3 className="font-designer-16b text-text-strong">
                  <a href={post.canonicalPath}>{post.title}</a>
                </h3>
                <p className="font-designer-12r text-text-subtle line-clamp-2 leading-relaxed">
                  {post.publicSummary}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );

  return (
    <>
      <PublicSeoHead
        title={`${document.name} | ZERO ONE IT`}
        description={document.description}
        canonical={`https://www.zeroone.it.kr${document.canonicalPath}`}
        image={document.bannerUrl}
      />
      <div className="w-full s8:mx-auto s8:max-w-study-content">
        <SeoHydrationBoundary
          waitForInteractiveReady
          serverSummary={serverSummary}
          interactive={<CommunityRoomDetailPage roomId={roomId} />}
        />
      </div>
    </>
  );
}
