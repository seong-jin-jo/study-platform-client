'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import ToggleButton from '@/components/common/ui/toggle/button';
import { useMyCommunityContextQuery } from '@/hooks/queries/community/use-community-discovery-query';

type Tab = 'community' | 'insight';

export default function MyPostsPage() {
  return (
    <Suspense fallback={null}>
      <MyPostsPageContent />
    </Suspense>
  );
}

function MyPostsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab: Tab =
    searchParams.get('tab') === 'insight' ? 'insight' : 'community';
  const { data, isLoading, isError } = useMyCommunityContextQuery();

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-400">
      <div>
        <h1 className="font-designer-20b text-text-strong">내가 작성한 글</h1>
        {data?.weeksTogetherLabel && (
          <p className="mt-50 font-designer-13r text-text-subtle">
            {data.weeksTogetherLabel}
          </p>
        )}
      </div>

      <div className="flex border-b border-border-subtle">
        {(
          [
            { id: 'community', label: '커뮤니티' },
            { id: 'insight', label: '인사이트' },
          ] as const
        ).map((tab) => (
          <ToggleButton
            key={tab.id}
            pressed={activeTab === tab.id}
            onPressedChange={() => setTab(tab.id)}
            size="md"
            variant="square"
            className={cn(
              'min-h-550 rounded-none border-0 bg-transparent px-250 font-designer-15b',
              activeTab === tab.id
                ? 'data-[state=on]:border-b-2 data-[state=on]:border-border-brand data-[state=on]:bg-transparent data-[state=on]:text-text-brand'
                : 'data-[state=off]:bg-transparent data-[state=off]:text-text-subtle',
            )}
          >
            {tab.label}
          </ToggleButton>
        ))}
      </div>

      {activeTab === 'community' ? (
        <CommunityPostList
          posts={data?.posts.items ?? []}
          isLoading={isLoading}
          isError={isError}
        />
      ) : (
        <div className="rounded-200 border border-border-subtle px-300 py-500 text-center">
          <p className="font-designer-14b text-text-default">
            인사이트 작성 내역을 불러오는 연결이 필요해요
          </p>
          <p className="mt-75 font-designer-13r text-text-subtle">
            작성자 기준 인사이트·댓글 조회 API가 연결되면 이 탭에서 함께
            보여드릴게요.
          </p>
        </div>
      )}
    </div>
  );
}

function CommunityPostList({
  posts,
  isLoading,
  isError,
}: {
  posts: Array<{ postId: number; title: string; publishedAt: string }>;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <p className="py-500 text-center font-designer-14r">불러오는 중...</p>
    );
  }
  if (isError) {
    return (
      <p className="py-500 text-center font-designer-14r text-text-subtle">
        작성한 글을 불러오지 못했어요.
      </p>
    );
  }
  if (posts.length === 0) {
    return (
      <p className="py-500 text-center font-designer-14r text-text-subtle">
        아직 남긴 글이 없어요
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border-subtle rounded-200 border border-border-subtle">
      {posts.map((post) => (
        <li key={post.postId}>
          <Link
            href={`/community/${post.postId}`}
            className="flex min-h-750 min-w-0 flex-col justify-center gap-50 px-250 hover:bg-background-neutral-subtle"
          >
            <span
              title={post.title}
              className="min-w-0 truncate font-designer-14b text-text-default"
            >
              {post.title}
            </span>
            <span className="font-designer-12r text-text-subtle">
              {new Date(post.publishedAt).toLocaleDateString('ko-KR')}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
