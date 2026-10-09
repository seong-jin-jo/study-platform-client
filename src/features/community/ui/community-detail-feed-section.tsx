'use client';

import Link from 'next/link';
import Button from '@/components/common/ui/button';
import { Skeleton } from '@/components/common/ui/loading-skeleton';
import { useCommunityRelatedPostsQuery } from '@/features/community/model/use-community-query';
import { resolveRelatedPostsUiState } from '@/utils/screen-resilience';
import CommunityPostListItem from './community-post-list-item';
import CommunitySectionShell from './community-section-shell';

interface CommunityDetailFeedSectionProps {
  currentPostId: number;
  isVisible: boolean;
}

const COMMUNITY_RELATED_POSTS_SIZE = 4;

export default function CommunityDetailFeedSection({
  currentPostId,
  isVisible,
}: CommunityDetailFeedSectionProps) {
  const relatedPostsQuery = useCommunityRelatedPostsQuery({
    postId: currentPostId,
    size: COMMUNITY_RELATED_POSTS_SIZE,
    enabled: isVisible,
  });
  const posts = relatedPostsQuery.data ?? [];
  const uiState = resolveRelatedPostsUiState({
    isVisible,
    isLoading: relatedPostsQuery.isLoading,
    isError: relatedPostsQuery.isError,
    itemCount: posts.length,
  });

  if (uiState === 'hidden') {
    return null;
  }

  return (
    <CommunitySectionShell className="gap-250 border-t border-border-default pt-300">
      <div className="flex flex-col gap-75">
        <h2 className="font-designer-24b text-text-strong">다른 글</h2>
        <p className="font-designer-14r text-text-subtle">
          커뮤니티 글 목록을 이어서 확인해보세요.
        </p>
      </div>

      {uiState === 'loading' ? (
        <output
          aria-label="다른 글을 불러오는 중"
          className="flex flex-col gap-150"
        >
          {Array.from({ length: COMMUNITY_RELATED_POSTS_SIZE }, (_, index) => (
            <Skeleton key={index} className="h-1000 w-full" />
          ))}
        </output>
      ) : uiState === 'error' ? (
        <div className="mx-auto flex max-w-4000 flex-col items-center gap-200 py-400 text-center">
          <div className="flex flex-col gap-75">
            <p className="font-designer-16b text-text-default">
              다른 글을 불러오지 못했어요
            </p>
            <p className="font-designer-14r text-text-subtle">
              잠시 뒤 다시 시도해 주세요.
            </p>
          </div>
          <Button
            color="outlined"
            size="small"
            onClick={() => relatedPostsQuery.refetch()}
          >
            다시 시도
          </Button>
        </div>
      ) : uiState === 'empty' ? (
        <div className="mx-auto flex max-w-4000 flex-col items-center gap-200 py-400 text-center">
          <div className="flex flex-col gap-75">
            <p className="font-designer-16b text-text-default">
              이어 볼 다른 글이 아직 없어요
            </p>
            <p className="font-designer-14r text-text-subtle">
              커뮤니티 목록에서 새 글을 둘러보세요.
            </p>
          </div>
          <Button asChild color="outlined" size="small">
            <Link href="/community">글 목록 보기</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-150">
          {posts.map((post) => (
            <CommunityPostListItem key={post.id} post={post} />
          ))}
        </div>
      )}
    </CommunitySectionShell>
  );
}
