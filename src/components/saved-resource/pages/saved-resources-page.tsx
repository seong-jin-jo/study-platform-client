'use client';

import {
  ArrowUp,
  Bookmark,
  Eye,
  LoaderCircle,
  MessageCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import HomeFeedCard from '@/components/common/cards/home-feed-card';
import Button from '@/components/common/ui/button';
import SaveResourceButton from '@/components/saved-resource/save-resource-button';
import { useSavedResourcesQuery } from '@/hooks/queries/saved-resource/use-saved-resource-queries';
import {
  SAVED_RESOURCE_TYPE,
  type SavedResourceItem,
  type SavedResourceType,
} from '@/types/saved-resource';

type SavedResourceFilter = 'ALL' | SavedResourceType;

const SAVED_RESOURCE_FILTERS: Array<{
  label: string;
  value: SavedResourceFilter;
}> = [
  { label: '전체', value: 'ALL' },
  { label: '공부방', value: SAVED_RESOURCE_TYPE.COMMUNITY_POST },
  { label: '인사이트', value: SAVED_RESOURCE_TYPE.INSIGHT_ARTICLE },
];

function formatSavedAt(value: string): string {
  const savedAt = new Date(value);
  if (Number.isNaN(savedAt.getTime())) {
    return '최근 저장';
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfSavedDay = new Date(
    savedAt.getFullYear(),
    savedAt.getMonth(),
    savedAt.getDate(),
  ).getTime();
  const elapsedDays = Math.floor(
    (startOfToday - startOfSavedDay) / (24 * 60 * 60 * 1000),
  );

  if (elapsedDays === 0) return '오늘 저장';
  if (elapsedDays === 1) return '어제 저장';
  if (elapsedDays > 1 && elapsedDays < 7) return `${elapsedDays}일 전 저장`;

  return `${savedAt.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  })} 저장`;
}

function SavedResourceCard({ item }: { item: SavedResourceItem }) {
  const isCommunity = item.resourceType === SAVED_RESOURCE_TYPE.COMMUNITY_POST;
  const resourceLabel = isCommunity ? '공부방' : '인사이트';
  const isAvailable =
    item.resourceState === 'AVAILABLE' && Boolean(item.destination);
  const destination = isAvailable ? item.destination : null;
  const preview =
    item.preview?.trim() ||
    item.unavailableMessage ||
    '이 글의 요약문을 지금 불러올 수 없어요.';
  const mediaUrl = isCommunity ? item.thumbnailUrl : item.coverUrl;

  return (
    <HomeFeedCard
      data-testid="saved-resource-card"
      aria-label={`저장한 ${resourceLabel} 글: ${item.title}`}
      className="gap-150"
    >
      <div
        role="group"
        aria-label="저장 정보"
        className="flex flex-wrap items-center gap-100"
      >
        <span
          role="status"
          aria-label={`분류 ${resourceLabel}`}
          className="font-designer-11b rounded-full bg-background-neutral-subtle px-100 py-50 text-text-subtle"
        >
          {resourceLabel}
        </span>
        <span
          role="group"
          aria-label="저장 시각"
          className="font-designer-11m text-text-subtlest"
        >
          <time dateTime={item.savedAt}>{formatSavedAt(item.savedAt)}</time>
        </span>
        <SaveResourceButton
          className="ml-auto"
          resourceKey={item.resourceKey}
          resourceType={item.resourceType}
          showLabel={true}
        />
      </div>

      {isCommunity && item.roomName ? (
        <div
          role="group"
          aria-label="출처 방"
          className="flex flex-wrap items-center gap-100 border-b border-border-subtle pb-150"
        >
          {item.roomAvatarUrl ? (
            <span className="relative size-300 flex-none overflow-hidden rounded-full bg-background-neutral-subtle">
              <Image
                src={item.roomAvatarUrl}
                alt={`${item.roomName} 방 아바타`}
                fill
                sizes="24px"
                unoptimized
                className="object-cover"
              />
            </span>
          ) : null}
          {item.roomId ? (
            <Link
              href={`/community/rooms/${item.roomId}`}
              className="font-designer-14b min-w-0 truncate text-text-strong hover:text-text-brand"
            >
              {item.roomName}
            </Link>
          ) : (
            <span className="font-designer-14b min-w-0 truncate text-text-strong">
              {item.roomName}
            </span>
          )}
          {typeof item.roomMemberCount === 'number' ? (
            <span
              role="status"
              aria-label={`방 멤버 ${item.roomMemberCount}명`}
              className="font-designer-11m ml-auto text-text-subtle"
            >
              멤버 {item.roomMemberCount}명
            </span>
          ) : null}
        </div>
      ) : null}

      {isCommunity && item.authorName ? (
        <div
          role="group"
          aria-label={`글쓴이 ${item.authorName}`}
          className="font-designer-12m flex flex-wrap items-center gap-75 text-text-subtle"
        >
          <span className="font-designer-12b text-text-strong">
            {item.authorName}
          </span>
          <span>멤버가 쓴 글</span>
        </div>
      ) : null}

      <div className="flex gap-150">
        <div className="min-w-0 flex-1">
          {destination ? (
            <Link
              href={destination}
              className="font-designer-16b line-clamp-2 block text-text-strong hover:text-text-brand"
            >
              {item.title}
            </Link>
          ) : (
            <h2 className="font-designer-16b line-clamp-2 text-text-strong">
              {item.title}
            </h2>
          )}
          <p
            role="note"
            aria-label="요약문"
            className="font-designer-13m mt-100 line-clamp-3 text-text-subtle"
          >
            {preview}
          </p>
        </div>
        {destination && mediaUrl ? (
          <Link
            href={destination}
            className="relative h-800 w-1100 flex-none overflow-hidden rounded-150 border border-border-subtle"
            aria-label={`${item.title} 이미지로 읽기`}
          >
            <Image
              src={mediaUrl}
              alt=""
              fill
              sizes="88px"
              unoptimized
              className="object-cover"
            />
          </Link>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="글 반응"
        className="font-designer-13b flex flex-wrap items-center gap-100 border-t border-border-subtle pt-150 text-text-subtle"
      >
        {typeof item.helpfulCount === 'number' ? (
          <span
            role="status"
            aria-label={`도움됨 ${item.helpfulCount}`}
            className="inline-flex items-center gap-50"
          >
            <ArrowUp className="size-150 text-icon-brand" aria-hidden="true" />
            도움됨 {item.helpfulCount}
          </span>
        ) : null}
        {isCommunity && typeof item.commentCount === 'number' && destination ? (
          <Link
            href={destination}
            className="inline-flex items-center gap-50 hover:text-text-default"
          >
            <MessageCircle className="size-150" aria-hidden="true" />
            댓글 {item.commentCount}
          </Link>
        ) : null}
        {typeof item.viewCount === 'number' ? (
          <span
            role="status"
            aria-label={`조회 ${item.viewCount}`}
            className="inline-flex items-center gap-50"
          >
            <Eye className="size-150" aria-hidden="true" />
            {item.viewCount}명이 봤어요
          </span>
        ) : null}
      </div>
    </HomeFeedCard>
  );
}

export default function SavedResourcesPage() {
  const [filter, setFilter] = useState<SavedResourceFilter>('ALL');
  const query = useSavedResourcesQuery({
    types: filter === 'ALL' ? undefined : [filter],
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.isPending) {
    return (
      <div className="flex min-h-2500 items-center justify-center text-text-subtlest">
        <LoaderCircle className="size-300 animate-spin" aria-hidden="true" />
        <span className="sr-only">저장한 글을 불러오는 중</span>
      </div>
    );
  }

  if (query.isError) {
    return (
      <section className="rounded-200 border border-border-default border-l-3 border-l-border-brand bg-background-default p-225">
        <h1 className="font-designer-15b text-text-strong">
          저장한 글을 불러오지 못했어요
        </h1>
        <p className="mt-75 font-designer-13r leading-250 text-text-subtle">
          잠깐 문제가 생겼어요. 다른 화면은 그대로 쓸 수 있어요.
        </p>
        <Button
          color="outlined"
          size="medium"
          className="mt-150"
          onClick={() => query.refetch()}
        >
          다시 시도
        </Button>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section aria-labelledby="saved-resources-heading">
        <h1
          id="saved-resources-heading"
          className="font-designer-20b text-text-strong"
        >
          저장한 글
          <span className="font-designer-10b ml-75 inline-flex rounded-full bg-fill-brand-default-default px-75 py-25 align-middle text-text-inverse">
            V3
          </span>
        </h1>
        <p className="mt-75 font-designer-13r text-text-subtle">
          글 오른쪽 아래의 깃발 모양을 누르면 여기에 모여요.
        </p>
        <div
          role="region"
          aria-labelledby="saved-resources-empty-heading"
          className="mt-200 rounded-200 border border-dashed border-border-default bg-background-default px-250 py-425 text-center"
        >
          <Bookmark
            className="mx-auto size-400 text-text-subtlest"
            aria-hidden="true"
          />
          <h2
            id="saved-resources-empty-heading"
            className="mt-150 font-designer-15b text-text-strong"
          >
            저장한 글이 아직 없어요
          </h2>
          <p className="mt-75 font-designer-13r leading-250 text-text-subtle">
            지금 못 읽는 글을 눌러 두면 나중에 여기에서 바로 찾을 수 있어요.
            <br />
            방에 안 들어가도 저장은 됩니다.
          </p>
          <Button asChild color="primary" size="large" className="mt-200">
            <Link href="/">읽을 글 보러 가기</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="saved-resources-heading">
      <h1
        id="saved-resources-heading"
        className="font-designer-20b text-text-strong"
      >
        저장한 글
        <span className="font-designer-10b ml-75 inline-flex rounded-full bg-fill-brand-default-default px-75 py-25 align-middle text-text-inverse">
          V3
        </span>
      </h1>
      <p className="mt-75 font-designer-13r text-text-subtle">
        최근에 저장한 순서예요. 저장은 {items.length}건입니다.
      </p>
      <div
        role="group"
        aria-label="저장한 글 분류"
        className="mt-150 flex flex-wrap gap-100"
      >
        {SAVED_RESOURCE_FILTERS.map((option) => {
          const isSelected = option.value === filter;

          return (
            <Button
              key={option.value}
              type="button"
              color={isSelected ? 'primary' : 'outlined'}
              size="medium"
              aria-pressed={isSelected}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      <div className="mt-200 flex flex-col gap-300 lg:gap-400">
        {items.map((item) => (
          <SavedResourceCard
            key={`${item.resourceType}-${item.resourceKey}`}
            item={item}
          />
        ))}
      </div>
      {query.hasNextPage ? (
        <Button
          color="outlined"
          size="large"
          className="mt-200 w-full"
          disabled={query.isFetchingNextPage}
          loading={query.isFetchingNextPage}
          loadingText="불러오는 중"
          onClick={() => query.fetchNextPage()}
        >
          저장한 글 더 보기
        </Button>
      ) : null}
      {!query.hasNextPage ? (
        <p className="font-designer-13b text-text-subtle px-200 pt-300 text-center leading-relaxed">
          저장해 둔 글은 여기까지예요
          <span className="font-designer-12m text-text-subtlest mt-75 block">
            방을 나가도 저장한 글은 그대로 남습니다.
          </span>
        </p>
      ) : null}
    </section>
  );
}
