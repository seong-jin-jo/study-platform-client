'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';

const UserProfileModal = dynamic(
  () => import('@/components/common/modals/user-profile-modal'),
  { ssr: false },
);
import { ROLE_LABELS } from '@/components/class/builder-feed-helpers';
import { AuthorAvatar, RoleBadge } from '@/components/class/builder-feed-utils';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import {
  FeedCommentIcon,
  FeedHeartIcon,
  FeedShareIcon,
} from '@/components/common/ui/icons/course-icons';
import type { BuilderFeedPreviewItemResponse } from '@/types/api/course.types';

interface Props {
  feeds: BuilderFeedPreviewItemResponse[];
  onSelectFeed?: (feedId: number) => void;
}

export function LessonBuilderFeedCard({ feeds, onSelectFeed }: Props) {
  const [page, setPage] = useState(0);
  const total = feeds.length;
  const hasFeed = total > 0;
  const current = hasFeed ? feeds[Math.min(page, total - 1)] : null;

  return (
    <div className="flex flex-col gap-200 rounded-150 border border-gray-300 bg-background-default p-300">
      <p className="font-designer-16b text-gray-1000">지금 HOT한 빌더 피드</p>

      <div className="relative">
        <Button
          type="button"
          onClick={() => current && onSelectFeed?.(current.feedId)}
          className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents relative h-2325 w-full overflow-hidden rounded-150 bg-gray-600"
          disabled={!onSelectFeed}
        >
          {current?.thumbnailUrl && (
            <Image
              src={current.thumbnailUrl}
              alt=""
              fill
              unoptimized
              sizes="100vw"
              className="object-cover"
            />
          )}
        </Button>

        {hasFeed && total > 1 && (
          <>
            <Button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="이전 피드"
              className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents absolute left-0 top-1/2 flex size-450 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-background-default disabled:opacity-50"
            >
              <ChevronLeft className="size-250 text-gray-800" />
            </Button>
            <Button
              type="button"
              onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
              disabled={page >= total - 1}
              aria-label="다음 피드"
              className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents absolute right-0 top-1/2 flex size-450 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border-default bg-background-default disabled:opacity-50"
            >
              <ChevronRight className="size-250 text-gray-800" />
            </Button>
          </>
        )}
      </div>

      {current && (
        <div className="flex flex-col gap-150">
          <div className="flex items-center gap-125">
            <UserProfileModal
              memberId={current.author.memberId}
              trigger={
                <Button
                  type="button"
                  className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents cursor-pointer"
                  aria-label={`${current.author.nickname} 프로필 보기`}
                >
                  <AuthorAvatar nickname={current.author.nickname} />
                </Button>
              }
            />
            <div className="flex min-w-0 flex-col">
              <div className="flex min-w-0 items-center gap-50">
                <p
                  title={current.author.nickname}
                  className="max-w-1500 min-w-0 truncate font-designer-14b text-gray-800 md:max-w-[180px]"
                >
                  {current.author.nickname}
                </p>
                <RoleBadge variant={current.author.role} />
              </div>
              {ROLE_LABELS[current.author.role] && (
                <p className="font-designer-12m text-gray-400">
                  {ROLE_LABELS[current.author.role]}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            onClick={() => onSelectFeed?.(current.feedId)}
            disabled={!onSelectFeed}
            className="inline-block h-auto cursor-default rounded-none bg-transparent px-0 font-[inherit] text-inherit hover:bg-transparent active:bg-transparent disabled:cursor-default disabled:bg-transparent disabled:text-inherit [&>span]:contents flex flex-col gap-150 text-left disabled:cursor-default"
          >
            <p className="line-clamp-2 font-designer-14r text-gray-1000">
              {current.content}
            </p>
            <div className="flex items-center gap-200">
              <div className="flex items-center gap-50">
                <FeedHeartIcon className="size-250 text-icon-brand" />
                <p className="font-designer-14r text-gray-1000">
                  {current.likeCount}
                </p>
              </div>
              <div className="flex items-center gap-50">
                <FeedCommentIcon className="size-250 text-gray-1000" />
                <p className="font-designer-14r text-gray-1000">
                  {current.commentCount}
                </p>
              </div>
              <FeedShareIcon className="size-250 text-gray-1000" />
            </div>
          </Button>
        </div>
      )}

      {hasFeed && total > 1 && (
        <div className="flex items-center justify-center gap-50">
          {feeds.map((f, i) => (
            <span
              key={f.feedId}
              className={cn(
                'h-75 w-75 rounded-full',
                i === page ? 'bg-background-brand-default' : 'bg-gray-300',
              )}
            />
          ))}
        </div>
      )}

      {!hasFeed && (
        <p className="text-center font-designer-13m text-gray-400">
          아직 등록된 피드가 없어요.
        </p>
      )}
    </div>
  );
}
