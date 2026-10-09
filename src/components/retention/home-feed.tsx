'use client';

import {
  ChevronRight,
  Flame,
  LoaderCircle,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Fragment, type RefObject, useCallback, useState } from 'react';
import {
  formatHomeFeedTime,
  HomeFeedCommunityPostCard,
  HomeFeedInsightCard,
} from '@/components/common/cards/home-feed-card';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import LogoLoading from '@/components/common/ui/logo-loading';
import ToggleButton from '@/components/common/ui/toggle/button';
import HomeHeroBanner from '@/components/home/home-hero-banner';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { useIntersectionObserver } from '@/hooks/common/use-intersection-observer';
import {
  useHomeFeedQuery,
  useUnifiedSearchQuery,
} from '@/hooks/queries/retention/use-retention-queries';
import type { UnifiedSearchItem } from '@/types/api/search.types';
import type { CommunityPostFeedResponse } from '@/types/community/post';
import type {
  HomeDiscoveryFeed,
  HomeDiscoverySort,
  HomeFeed as HomeFeedData,
  PublicHomeFeed,
} from '@/types/retention/contracts';
import {
  ACTIVITY_PROGRESS_TARGETS,
  clampActivityProgress,
} from '@/utils/screen-resilience';

const DISCOVERY_SORTS: Array<{ id: HomeDiscoverySort; label: string }> = [
  { id: 'NEW', label: '새 글' },
  { id: 'HOT', label: '많이 도움된 글' },
  { id: 'TOP', label: 'Top' },
];

const ROOM_ICONS = [
  '/community/rooms/icons/room-web.jpg',
  '/community/rooms/icons/room-auto.jpg',
  '/community/rooms/icons/room-deploy.jpg',
  '/community/rooms/icons/room-portfolio.jpg',
] as const;

const AVATARS = [
  '/community/rooms/avatars/avatar-jihoon.jpg',
  '/community/rooms/avatars/avatar-mina.jpg',
  '/community/rooms/avatars/avatar-seojin.jpg',
  '/community/rooms/avatars/avatar-taeo.jpg',
] as const;

type DiscoveryItem = HomeDiscoveryFeed['items'][number];
type CommunityItem = Extract<DiscoveryItem, { type: 'COMMUNITY_POST' }>;
type InsightItem = Extract<DiscoveryItem, { type: 'INSIGHT_ARTICLE' }>;

function getCommunityHref(item: CommunityItem) {
  return `/community/${item.id.replace('post:', '')}`;
}

function getRoomHref(roomId: number | undefined) {
  return typeof roomId === 'number' &&
    Number.isSafeInteger(roomId) &&
    roomId > 0
    ? `/community/rooms/${roomId}`
    : '/community';
}

function getRoomLabel(
  item: Pick<CommunityItem, 'roomId' | 'roomName'>,
  rooms: HomeFeedData['myRooms'],
): string {
  return (
    item.roomName ??
    rooms.find((room) => room.id === item.roomId)?.goalLabel ??
    rooms.find((room) => room.id === item.roomId)?.badge ??
    '바이브코딩 질문 방'
  );
}

function RoomIcon({
  index,
  label,
  size = 'md',
}: {
  index: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span
      className={cn(
        'relative block flex-none overflow-hidden rounded-full bg-gray-100',
        size === 'sm' && 'size-225',
        size === 'md' && 'size-275',
        size === 'lg' && 'size-400',
      )}
    >
      <Image
        src={ROOM_ICONS[index % ROOM_ICONS.length]}
        alt=""
        fill
        sizes={size === 'lg' ? '32px' : '22px'}
        className="object-cover"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function AvatarTrail({ count = 3 }: { count?: number }) {
  const visible = AVATARS.slice(
    0,
    Math.max(1, Math.min(count, AVATARS.length)),
  );
  return (
    <span className="flex flex-none" aria-hidden>
      {visible.map((avatar, index) => (
        <span
          key={avatar}
          className={cn(
            'relative size-225 overflow-hidden rounded-full border-2 border-white',
            index > 0 && '-ml-75',
          )}
        >
          <Image
            src={avatar}
            alt=""
            fill
            sizes="18px"
            className="object-cover"
          />
        </span>
      ))}
    </span>
  );
}

function TrendingStrip({
  items,
  rooms,
}: {
  items: HomeDiscoveryFeed['items'];
  rooms: HomeFeedData['myRooms'];
}) {
  const posts = items
    .filter((item): item is CommunityItem => item.type === 'COMMUNITY_POST')
    .sort((a, b) => b.stats.helpfulCount - a.stats.helpfulCount)
    .slice(0, 4);

  if (posts.length === 0) {
    return (
      <section className="border-y border-gray-200 bg-white px-175 py-200 sm:rounded-200 sm:border sm:px-200">
        <h2 className="flex items-center gap-75 font-designer-12b font-black tracking-[0.02em] text-orange-600 max-lg:font-designer-20b max-lg:font-black">
          <Flame className="size-175" aria-hidden />
          지금 뜨는 글
        </h2>
        <p className="mt-100 font-designer-12m leading-[1.6] font-medium text-gray-500 max-lg:font-designer-16r">
          아직 많이 도움된 글이 없어요. 새 글부터 둘러보세요.
        </p>
      </section>
    );
  }

  return (
    <section className="border-y border-gray-200 bg-white px-175 py-150 sm:rounded-200 sm:border sm:px-200">
      {/* 승인 시안은 "지금 뜨는 글" 우측에 더 보기를 둔다. 구현에 빠져 있어
          피드에서 목록으로 가는 입구가 없었다(회장 확정 2026-08-20 "시안대로 넣는다"). */}
      <div className="flex items-center justify-between gap-100">
        <h2 className="flex items-center gap-75 font-designer-12b font-black tracking-[0.02em] text-orange-600 max-lg:font-designer-20b max-lg:font-black">
          <Flame className="size-175" aria-hidden />
          지금 뜨는 글
        </h2>
        <Link
          href="/community"
          className="font-designer-12m inline-flex min-h-550 min-w-550 items-center justify-center font-semibold text-gray-500 transition-colors hover:text-gray-800 max-lg:font-designer-16m"
        >
          더 보기
        </Link>
      </div>
      <div className="mt-125 flex gap-100 overflow-x-auto pb-25 [scrollbar-width:none]">
        {posts.map((post, index) => (
          <Link
            key={post.id}
            href={getCommunityHref(post)}
            className="w-2500 flex-none rounded-150 border border-gray-200 p-125 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <span
              className={cn(
                'block font-designer-12b font-extrabold max-lg:font-designer-16b max-lg:font-extrabold',
                index % 2 === 0 ? 'text-blue-700' : 'text-green-700',
              )}
            >
              {getRoomLabel(post, rooms)}
            </span>
            <span className="mt-50 line-clamp-2 block font-designer-13b leading-[1.4] font-extrabold tracking-[-0.015em] text-gray-900 max-lg:font-designer-16b max-lg:leading-[1.4] max-lg:font-extrabold">
              {post.title}
            </span>
            <span className="mt-50 block font-designer-12m font-semibold tabular-nums text-gray-400 max-lg:font-designer-16m">
              도움됨 {post.stats.helpfulCount} · 댓글 {post.stats.commentCount}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SortBar({
  sort,
  onSortChange,
  audience = 'member',
}: {
  sort: HomeDiscoverySort;
  onSortChange: (sort: HomeDiscoverySort) => void;
  audience?: 'guest' | 'member';
}) {
  const visibleSorts =
    audience === 'guest'
      ? DISCOVERY_SORTS.filter((option) => option.id !== 'TOP')
      : DISCOVERY_SORTS;

  return (
    <div className="flex items-center gap-50 border-y border-gray-200 bg-white px-125 py-75 sm:rounded-200 sm:border">
      {visibleSorts.map((option) => (
        <ToggleButton
          key={option.id}
          pressed={sort === option.id}
          onPressedChange={() => onSortChange(option.id)}
          color="gray"
          size="sm"
          variant="round"
          className={cn(
            'gap-50 border-0 px-125 py-75 font-designer-13b font-extrabold max-lg:min-h-550 max-lg:font-designer-16m',
            sort === option.id
              ? 'data-[state=on]:border-0 data-[state=on]:bg-gray-100 data-[state=on]:text-gray-950'
              : 'data-[state=off]:border-0 data-[state=off]:bg-transparent data-[state=off]:text-gray-500 hover:text-gray-900',
          )}
        >
          {option.id === 'HOT' && <Flame className="size-150" aria-hidden />}
          {option.label}
        </ToggleButton>
      ))}
      <span className="ml-auto hidden font-designer-12m font-semibold text-gray-400 sm:block max-lg:font-designer-16r">
        모든 방의 글이 섞여 나와요
      </span>
    </div>
  );
}

function CommunityPostCard({
  item,
  index,
  rooms,
  audience = 'member',
}: {
  item: CommunityItem;
  index: number;
  rooms: HomeFeedData['myRooms'];
  audience?: 'guest' | 'member';
}) {
  const href = getCommunityHref(item);
  const roomLabel = getRoomLabel(item, rooms);
  const room = rooms.find((candidate) => candidate.id === item.roomId);

  return (
    <HomeFeedCommunityPostCard
      data={{
        resourceKey: item.id.replace('post:', ''),
        href,
        roomHref: getRoomHref(item.roomId),
        roomName: roomLabel,
        roomAvatarUrl: ROOM_ICONS[index % ROOM_ICONS.length],
        roomMemberAvatarUrls: [...AVATARS.slice(0, 3)],
        roomMemberCount: room?.memberCount,
        roomJoined: audience === 'member' ? Boolean(room) : false,
        createdAt: item.createdAt,
        authorName: item.authorName?.trim() || null,
        authorAvatarUrl: item.authorAvatarUrl,
        title: item.title,
        preview: item.excerpt,
        thumbnailUrl: item.thumbnailUrl,
        helpfulCount: item.stats.helpfulCount,
        commentCount: item.stats.commentCount,
        viewCount: item.stats.viewCount,
      }}
    />
  );
}

function InsightCard({ item }: { item: InsightItem }) {
  const href = `/insights/${encodeURIComponent(item.slug)}`;
  return (
    <HomeFeedInsightCard
      data={{
        resourceKey: item.documentId,
        href,
        title: item.title,
        coverUrl: item.coverUrl,
        categoryLabel: item.categoryLabel,
        viewCount: item.stats.viewCount,
        helpfulCount: item.stats.helpfulCount,
      }}
    />
  );
}

function AdSlot({ insight }: { insight?: InsightItem }) {
  return (
    <aside
      className={cn(
        'min-h-home-ad-slot rounded-200 border p-200',
        insight
          ? 'border-home-card-line bg-white'
          : 'border-dashed border-gray-300 bg-gray-50',
      )}
      aria-label="콘텐츠 추천 자리"
      data-testid="home-ad-slot"
    >
      <span className="inline-flex rounded-full border border-gray-300 bg-white px-100 py-50 font-designer-12b font-black text-gray-600">
        {insight ? '제로원이 고른 글' : '이 자리'}
      </span>
      {insight ? (
        <Link
          href={`/insights/${encodeURIComponent(insight.slug)}`}
          className="mt-125 flex items-center gap-150"
        >
          {insight.coverUrl && (
            <span className="relative size-800 flex-none overflow-hidden rounded-150 bg-gray-100">
              <Image
                src={insight.coverUrl}
                alt=""
                fill
                sizes="64px"
                unoptimized
                className="object-cover"
              />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <b className="line-clamp-2 block text-[14px] leading-[1.42] font-extrabold tracking-[-0.02em] text-gray-900 max-lg:font-designer-16b max-lg:font-extrabold">
              {insight.title}
            </b>
            <span className="mt-50 line-clamp-2 block font-designer-12m leading-[1.55] font-semibold text-gray-600 max-lg:font-designer-16r">
              인사이트 · 방금 읽은 글 다음에 보면 좋아요
            </span>
          </span>
          <ChevronRight className="size-200 flex-none text-gray-400" />
        </Link>
      ) : (
        <p className="mt-125 font-designer-12b leading-[1.65] font-bold text-gray-500 max-lg:font-designer-16r">
          <b className="text-gray-800">여기는 나중에 채워질 자리예요.</b> 자리는
          미리 잡아 두었습니다.
        </p>
      )}
    </aside>
  );
}

function InsightRail({ items }: { items: HomeDiscoveryFeed['items'] }) {
  const insights = items.filter(
    (item): item is InsightItem => item.type === 'INSIGHT_ARTICLE',
  );

  return (
    <section className="rounded-200 border border-gray-200 bg-white p-200">
      <h2 className="text-[15px] font-black tracking-[-0.02em] text-gray-900 max-lg:font-designer-20b max-lg:font-black">
        인사이트
      </h2>
      {insights.length === 0 ? (
        <div className="mt-125 rounded-200 border border-dashed border-gray-300 px-175 py-225 text-center">
          <p className="text-[15px] font-extrabold text-gray-900">
            이번 주 새 글은 아직이에요
          </p>
          <p className="mt-75 font-designer-13m leading-[1.6] font-medium text-gray-600 max-lg:font-designer-16r">
            대신 지금 이야기가 오가는 방부터 둘러보세요.
          </p>
          <Link
            href="/community"
            className="mt-175 inline-flex min-h-550 items-center rounded-150 bg-gray-900 px-175 font-designer-12b font-extrabold text-white max-lg:font-designer-16m"
          >
            방 둘러보기
          </Link>
        </div>
      ) : (
        <div className="mt-100">
          {insights.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href={`/insights/${encodeURIComponent(item.slug)}`}
              className="flex gap-100 border-t border-gray-100 py-125 first:border-t-0"
            >
              <span className="mt-25 flex-none self-start rounded-full bg-blue-50 px-100 py-25 font-designer-12b font-extrabold text-blue-700">
                인사이트
              </span>
              <span className="min-w-0">
                <b className="line-clamp-2 block font-designer-13b leading-[1.45] font-extrabold text-gray-900 max-lg:font-designer-16b max-lg:font-extrabold">
                  {item.title}
                </b>
                <span className="mt-25 block font-designer-12m font-semibold text-gray-500 max-lg:font-designer-16m">
                  도움됨 {item.stats.helpfulCount}
                </span>
              </span>
            </Link>
          ))}
          <p className="border-t border-gray-100 pt-100 text-center font-designer-12m font-semibold text-gray-500">
            이번 주 새 글 {insights.length}개
          </p>
        </div>
      )}
    </section>
  );
}

function SearchResultCard({
  item,
  query,
}: {
  item: UnifiedSearchItem;
  query: string;
}) {
  const isCommunity = item.type === 'COMMUNITY_POST';

  return (
    <article
      className={cn(
        'min-h-2125 rounded-200 border border-home-card-line bg-white p-225 lg:p-275',
        !isCommunity && 'border-l-4 border-l-blue-600',
      )}
      data-testid="search-result-card"
    >
      <div className="flex items-center gap-100 border-b border-gray-200 pb-125">
        <span
          className={cn(
            'rounded-full px-100 py-50 font-designer-12b font-black',
            isCommunity
              ? 'bg-rose-50 text-rose-700'
              : 'bg-blue-50 text-blue-700',
          )}
        >
          {isCommunity ? '공부방 글' : '인사이트'}
        </span>
        <time
          dateTime={item.publishedAt}
          className="ml-auto font-designer-12m font-semibold text-gray-500"
        >
          {formatHomeFeedTime(item.publishedAt)}
        </time>
      </div>
      <Link href={item.destination} className="mt-150 block">
        <h3 className="text-[15.5px] leading-[1.42] font-extrabold tracking-[-0.02em] text-gray-900 max-lg:text-[16px] lg:text-[16.5px]">
          {item.title.includes(query) ? (
            <>
              {item.title.split(query).map((part, index, parts) => (
                <Fragment key={`${part}-${index}`}>
                  {part}
                  {index < parts.length - 1 && (
                    <mark className="bg-yellow-100 text-inherit">{query}</mark>
                  )}
                </Fragment>
              ))}
            </>
          ) : (
            item.title
          )}
        </h3>
        <p className="mt-100 line-clamp-3 font-designer-13m leading-[1.7] font-medium text-gray-600 lg:line-clamp-4">
          {item.previewText}
        </p>
      </Link>
      {isCommunity && item.access === 'PREVIEW' && (
        <p className="mt-125 font-designer-12b font-extrabold text-rose-700">
          아직 들어가지 않은 방의 글은 앞부분만 보여요
        </p>
      )}
    </article>
  );
}

function SearchResults({ query }: { query: string }) {
  const searchQuery = useUnifiedSearchQuery(query);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = searchQuery;
  const loadMoreRef = useIntersectionObserver(
    useCallback(() => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage().catch(() => undefined);
      }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]),
    {
      enabled: hasNextPage && !isFetchingNextPage,
      rootMargin: '160px',
    },
  );

  const communityCount =
    searchQuery.data?.items.filter((item) => item.type === 'COMMUNITY_POST')
      .length ?? 0;
  const insightCount =
    searchQuery.data?.items.filter((item) => item.type === 'INSIGHT_ARTICLE')
      .length ?? 0;

  return (
    <section aria-label="통합검색 결과">
      <div className="mb-175 flex items-center gap-112 rounded-full border border-home-card-line bg-white px-175 py-112">
        <Search className="size-200 flex-none text-gray-500" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-gray-900 max-lg:text-[16px]">
          {query}
        </span>
        <Link
          href="/"
          aria-label="검색 지우고 홈으로"
          className="flex size-500 flex-none items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        >
          <X className="size-200" aria-hidden />
        </Link>
      </div>

      {searchQuery.isLoading ? (
        <div className="space-y-300" aria-label="검색 중">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-2125 animate-pulse rounded-200 border border-gray-200 bg-white p-225"
            >
              <div className="h-175 w-1125 rounded-full bg-gray-200" />
              <div className="mt-175 h-200 w-2500 rounded-100 bg-gray-200" />
              <div className="mt-125 h-500 rounded-100 bg-gray-100" />
            </div>
          ))}
        </div>
      ) : searchQuery.isError ? (
        <div className="rounded-150 border border-gray-200 border-l-4 border-l-rose-500 bg-white p-200">
          <h2 className="text-[14px] font-extrabold text-gray-900">
            검색이 잠깐 안 되고 있어요
          </h2>
          <p className="mt-75 font-designer-13r leading-[1.6] text-gray-600">
            잠시 후 다시 눌러 주세요. 오른쪽 인사이트와 내 방은 그대로 볼 수
            있어요.
          </p>
          <Button
            type="button"
            color="outlined"
            size="large"
            onClick={() => searchQuery.refetch()}
            className="mt-150 h-550 rounded-150 px-175 font-designer-12b text-gray-800"
          >
            다시 시도
          </Button>
        </div>
      ) : searchQuery.data?.partial && searchQuery.data.items.length === 0 ? (
        <div className="rounded-150 border border-gray-200 border-l-4 border-l-yellow-500 bg-white p-200">
          <h2 className="text-[14px] font-extrabold text-gray-900">
            검색 결과를 아직 불러오지 못했어요
          </h2>
          <p className="mt-75 font-designer-13r leading-[1.6] text-gray-600">
            검색 소스가 잠시 응답하지 않았어요. 없는 결과로 처리하지 않았으니
            잠시 후 다시 시도해 주세요.
          </p>
          <Button
            type="button"
            color="outlined"
            size="large"
            onClick={() => searchQuery.refetch()}
            className="mt-150 h-550 rounded-150 px-175 font-designer-12b text-gray-800"
          >
            다시 시도
          </Button>
        </div>
      ) : searchQuery.data?.items.length === 0 ? (
        <div className="rounded-200 border border-dashed border-home-card-line bg-white px-225 py-300 text-center">
          <h2 className="text-[15px] font-extrabold text-gray-900">
            &quot;{query}&quot;으로 나온 글이 없어요
          </h2>
          <p className="mt-75 font-designer-13r leading-[1.6] text-gray-600">
            아직 아무도 이 이야기를 안 남겼어요. 사람이 많은 방에서 직접
            물어보는 게 빠를 수 있어요.
          </p>
          <Link
            href="/community"
            className="mt-175 inline-flex min-h-550 items-center rounded-150 bg-gray-900 px-200 font-designer-13b font-extrabold text-white"
          >
            사람 많은 방 보기
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-150 font-designer-13b font-bold text-gray-600">
            공부방 글 <b className="text-gray-900">{communityCount}</b>건,
            인사이트 <b className="text-gray-900">{insightCount}</b>건을
            찾았어요
          </p>
          {searchQuery.data?.partial && (
            <p className="mb-150 rounded-150 bg-yellow-50 px-150 py-125 font-designer-12b font-bold text-yellow-700">
              일부 결과를 불러오지 못했어요. 지금 찾은 글부터 보여드려요.
            </p>
          )}
          <div className="space-y-300 lg:space-y-400">
            {searchQuery.data?.items.map((item) => (
              <SearchResultCard
                key={`${item.type}-${item.resourceKey}`}
                item={item}
                query={query}
              />
            ))}
          </div>
          <div
            ref={loadMoreRef as RefObject<HTMLDivElement>}
            className="py-225 text-center font-designer-12b font-bold text-gray-500"
            data-testid="search-load-more"
          >
            {searchQuery.isFetchingNextPage ? (
              <LoaderCircle className="mx-auto size-250 animate-spin" />
            ) : searchQuery.hasNextPage ? (
              '아래로 내리면 계속 이어져요'
            ) : (
              <>
                찾은 글은 여기까지예요
                <span className="mt-50 block font-semibold text-gray-400">
                  더 있을 것 같으면 방 안에서 찾아보세요.
                </span>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function FreshPosts({
  items,
  rooms,
}: {
  items: HomeDiscoveryFeed['items'];
  rooms: HomeFeedData['myRooms'];
}) {
  const fresh = items
    .filter((item): item is CommunityItem => item.type === 'COMMUNITY_POST')
    .slice(-3);

  if (fresh.length === 0) {
    return (
      <section className="border-y border-gray-200 bg-white px-175 py-200 sm:rounded-200 sm:border">
        <h2 className="font-designer-12b font-black tracking-[0.02em] text-blue-700 max-lg:font-designer-20b max-lg:font-black">
          방금 올라온 글
        </h2>
        <p className="mt-75 font-designer-12m leading-[1.6] font-medium text-gray-500 max-lg:font-designer-16r">
          이번 주 새 글은 아직이에요.
        </p>
      </section>
    );
  }

  return (
    <section className="border-y border-gray-200 bg-white px-175 py-150 sm:rounded-200 sm:border">
      <h2 className="font-designer-12b font-black tracking-[0.02em] text-blue-700 max-lg:font-designer-20b max-lg:font-black">
        방금 올라온 글
      </h2>
      <div className="mt-75">
        {fresh.map((item, index) => (
          <Link
            key={item.id}
            href={getCommunityHref(item)}
            className="flex items-center gap-75 border-t border-gray-100 py-100 first:border-t-0 max-lg:min-h-550"
          >
            <RoomIcon
              index={index + 1}
              label={getRoomLabel(item, rooms)}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate font-designer-12b font-bold text-gray-800 hover:text-rose-600 max-lg:font-designer-16b max-lg:font-bold">
              {item.title}
            </span>
            <span className="flex-none font-designer-12m font-semibold text-gray-400">
              {formatHomeFeedTime(item.createdAt)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ActivityCard({
  feed,
}: {
  feed: Pick<
    HomeFeedData,
    'continueReading' | 'myRooms' | 'streak' | 'discoveryFeed'
  >;
}) {
  const points = clampActivityProgress(
    feed.continueReading?.readingPointsBalance ?? 0,
    ACTIVITY_PROGRESS_TARGETS.readingPoints,
  );
  const visibleIslands = clampActivityProgress(
    feed.discoveryFeed.items.filter((item) => item.type === 'INSIGHT_ARTICLE')
      .length,
    ACTIVITY_PROGRESS_TARGETS.islands,
  );
  const visibleHelpful = feed.discoveryFeed.items
    .filter((item): item is CommunityItem => item.type === 'COMMUNITY_POST')
    .reduce((sum, item) => sum + item.stats.helpfulCount, 0);

  return (
    <section className="rounded-200 border border-gray-200 bg-white p-200">
      <h2 className="font-designer-12b font-black tracking-[0.02em] text-gray-500 max-lg:font-designer-20b max-lg:font-black">
        내 활동
      </h2>
      <div className="mt-125 grid grid-cols-3 gap-100">
        <div className="rounded-150 bg-gray-50 px-75 py-150 text-center">
          <strong className="block text-[17px] font-black tabular-nums text-rose-600">
            {points}
            <span className="text-gray-900">
              /{ACTIVITY_PROGRESS_TARGETS.readingPoints}
            </span>
          </strong>
          <span className="mt-25 block font-designer-12b font-bold text-gray-500 max-lg:font-designer-16m">
            읽기 포인트
          </span>
        </div>
        <div className="rounded-150 bg-gray-50 px-75 py-150 text-center">
          <strong className="block text-[17px] font-black tabular-nums text-gray-900">
            {visibleIslands}
            <span className="text-gray-400">
              /{ACTIVITY_PROGRESS_TARGETS.islands}
            </span>
          </strong>
          <span className="mt-25 block font-designer-12b font-bold text-gray-500 max-lg:font-designer-16m">
            정복한 섬
          </span>
        </div>
        <div className="rounded-150 bg-gray-50 px-75 py-150 text-center">
          <strong className="block text-[17px] font-black tabular-nums text-gray-900">
            +{visibleHelpful}
          </strong>
          <span className="mt-25 block font-designer-12b font-bold text-gray-500 max-lg:font-designer-16m">
            받은 도움됨
          </span>
        </div>
      </div>
      <p className="mt-125 font-designer-12m leading-[1.55] font-medium text-gray-400 max-lg:font-designer-16r">
        읽기 포인트는 개인 기록이에요. 섬과 도움됨은 현재 홈에 보이는 글
        범위예요.
      </p>
      <p className="mt-75 rounded-100 bg-rose-50 px-100 py-75 font-designer-12b font-bold text-rose-700 max-lg:font-designer-16m">
        {feed.streak.todayCompleted
          ? `오늘 이어가기 완료 · ${feed.streak.count}일째`
          : `${feed.streak.count}일째 이어가는 중 · 오늘 기록을 남겨보세요`}
      </p>
    </section>
  );
}

function PopularRooms({ rooms }: { rooms: HomeFeedData['myRooms'] }) {
  return (
    <section className="rounded-200 border border-gray-200 bg-white p-200">
      <h2 className="font-designer-12b font-black tracking-[0.02em] text-gray-500 max-lg:font-designer-20b max-lg:font-black">
        인기 방, 목표가 같은 사람들
      </h2>
      <div className="mt-100">
        {rooms.length === 0 ? (
          <p className="py-150 font-designer-12m font-medium text-gray-500 max-lg:font-designer-16r">
            아직 입장한 방이 없어요. 목표가 같은 방부터 둘러보세요.
          </p>
        ) : (
          rooms.slice(0, 4).map((room, index) => (
            <div
              key={room.id}
              className="flex items-center gap-100 border-t border-gray-100 py-100 first:border-t-0"
            >
              <RoomIcon
                index={index}
                label={room.goalLabel ?? room.badge}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-designer-13b font-extrabold text-gray-900 max-lg:font-designer-16b max-lg:font-extrabold">
                  {room.goalLabel ?? room.badge}
                </p>
                <p className="mt-25 truncate font-designer-12m font-semibold tabular-nums text-gray-500">
                  멤버 {room.memberCount} · 새 글 {room.newPostsCount} ·{' '}
                  {room.badge}
                </p>
              </div>
              <Link
                href={getRoomHref(room.id)}
                className="flex min-h-550 min-w-550 flex-none items-center justify-center rounded-full border border-gray-200 px-125 py-75 font-designer-12b font-extrabold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 max-lg:font-designer-16m"
              >
                입장함
              </Link>
            </div>
          ))
        )}
      </div>
      <Link
        href="/community"
        className="mt-100 flex min-h-550 w-full items-center justify-center rounded-150 border border-gray-200 py-125 font-designer-12b font-extrabold text-gray-800 hover:bg-gray-50 max-lg:font-designer-16m"
      >
        방 전부 둘러보기
      </Link>
    </section>
  );
}

function NewMembersCard({ week }: { week: HomeFeedData['newMembersWeek'] }) {
  return (
    <section className="rounded-200 border border-gray-200 bg-white p-200">
      <h2 className="font-designer-12b font-black tracking-[0.02em] text-gray-500 max-lg:font-designer-20b max-lg:font-black">
        이번 주 새 멤버 {week.total}명
      </h2>
      <div className="mt-125 flex items-center gap-125">
        <AvatarTrail count={4} />
        <p className="font-designer-12m leading-[1.6] font-medium text-gray-600 max-lg:font-designer-16r">
          {week.byInterest.length > 0
            ? week.byInterest
                .slice(0, 3)
                .map((item) => `${item.interest} ${item.count}명`)
                .join(', ')
            : '새 멤버가 들어오면 관심 목표가 여기에 보여요.'}
        </p>
      </div>
    </section>
  );
}

function PublicInsightRail({
  items,
}: {
  items: PublicHomeFeed['topInsights'];
}) {
  return (
    <section className="rounded-200 border border-gray-200 bg-white p-200">
      <h2 className="font-designer-15b text-text-strong max-lg:font-designer-20b">
        인사이트
      </h2>
      {items.length === 0 ? (
        <div className="mt-125 rounded-200 border border-dashed border-gray-300 px-175 py-225 text-center">
          <p className="font-designer-15b text-text-strong">
            이번 주 새 글은 아직이에요
          </p>
          <p className="font-designer-13m mt-75 break-keep text-text-subtle max-lg:font-designer-16r">
            대신 지금 이야기가 오가는 방부터 둘러보세요.
          </p>
          <Button
            asChild
            color="secondary"
            size="large"
            className="mt-175 font-designer-12b max-lg:font-designer-16m"
          >
            <Link href="/community">방 둘러보기</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-100">
          {items.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href="/insights"
              className="flex gap-100 border-t border-gray-100 py-125 first:border-t-0"
            >
              <span className="font-designer-11b mt-25 flex-none self-start rounded-full bg-blue-50 px-100 py-25 text-blue-700">
                인사이트
              </span>
              <span className="min-w-0">
                <b className="font-designer-13b line-clamp-2 block text-text-strong max-lg:font-designer-16b">
                  {item.title}
                </b>
                <span className="font-designer-11m mt-25 block text-text-subtle">
                  {item.board} · 조회 {item.viewCount.toLocaleString()}회
                </span>
              </span>
            </Link>
          ))}
          <p className="font-designer-11m border-t border-gray-100 pt-100 text-center text-text-subtle">
            이번 주 새 글 {items.length}개
          </p>
        </div>
      )}
    </section>
  );
}

function GuestRoomRail({ roomLimit }: { roomLimit: number }) {
  return (
    <section className="rounded-200 border border-gray-200 bg-white p-200">
      <h2 className="font-designer-12b flex items-center justify-between text-text-subtle max-lg:font-designer-20b">
        <span>입장한 방</span>
        <strong className="font-designer-14b text-text-strong">
          0/{roomLimit}
        </strong>
      </h2>
      <div className="mt-125 rounded-150 bg-background-alternative p-175">
        <p className="font-designer-14b text-text-strong">
          아직 소속된 방이 없어요
        </p>
        <p className="font-designer-13m mt-75 break-keep text-text-subtle max-lg:font-designer-16r">
          목표가 가장 가까운 방 하나를 먼저 골라보세요. 읽기만 해도 괜찮아요.
        </p>
      </div>
    </section>
  );
}

function createGuestFeed(
  postFeed: CommunityPostFeedResponse,
  publicFeed: PublicHomeFeed,
  sort: HomeDiscoverySort,
): HomeFeedData {
  const posts = sort === 'HOT' ? postFeed.popularItems : postFeed.items;

  // 승인 시안의 게스트 피드는 글 사이에 인사이트 카드를 끼워 넣는다.
  // 공개 인사이트에는 slug 가 없지만 상세 라우트가 /insights/[id] 라 id 로 연결된다.
  const insightItems = publicFeed.topInsights.map((insight) => ({
    type: 'INSIGHT_ARTICLE' as const,
    id: `insight:${insight.id}`,
    documentId: String(insight.id),
    slug: String(insight.id),
    title: insight.title,
    excerpt: insight.excerpt,
    stats: { viewCount: insight.viewCount, helpfulCount: 0 },
  }));

  const postItems = posts.map((post) => ({
    type: 'COMMUNITY_POST' as const,
    id: `post:${post.postId}`,
    roomId: 0,
    // 공개 글 응답에는 방 식별자·이름·멤버 수가 없다(2026-08-20 실측: item keys 에
    // roomId/roomName 부재). board 는 게시판 코드("free")라 시안의 방 이름 자리에
    // 넣으면 독자에게 의미 없는 값이 노출된다. 비워 두면 getRoomLabel 이 기본
    // 방 이름으로 떨어진다. 진짜 방 이름·멤버 수는 백엔드가 공개 응답에 필드를
    // 추가해야 채울 수 있다.
    roomName: undefined,
    title: post.title,
    excerpt: post.excerpt,
    thumbnailUrl: post.previewImageUrl ?? undefined,
    authorName: post.author.name,
    authorAvatarUrl: post.author.profileImageUrl ?? undefined,
    createdAt: post.createdAt,
    stats: {
      viewCount: post.stats.viewCount,
      commentCount: post.stats.commentCount,
      helpfulCount: post.stats.likeCount,
    },
  }));

  // 시안과 같은 리듬으로 글 3개마다 인사이트 하나를 끼운다.
  const mixed: HomeFeedData['discoveryFeed']['items'] = [];
  let insightIndex = 0;
  postItems.forEach((post, index) => {
    mixed.push(post);
    if ((index + 1) % 3 === 0 && insightIndex < insightItems.length) {
      mixed.push(insightItems[insightIndex]);
      insightIndex += 1;
    }
  });

  return {
    userName: '',
    streak: {
      count: 0,
      todayCompleted: false,
      atRisk: false,
      nextMilestone: null,
    },
    continueReading: null,
    myRooms: [],
    communityToday: null,
    newMembersWeek: publicFeed.newMembersWeek,
    discoveryFeed: {
      sort,
      nextCursor: null,
      items: mixed,
    },
  };
}

export function GuestHomeFeedBody({
  postFeed,
  publicFeed,
  roomLimit,
}: {
  postFeed: CommunityPostFeedResponse;
  publicFeed: PublicHomeFeed;
  roomLimit: number;
}) {
  const [sort, setSort] = useState<HomeDiscoverySort>('NEW');
  const feed = createGuestFeed(postFeed, publicFeed, sort);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <main className="mx-auto w-full max-w-16000 overflow-hidden bg-gray-50 sm:my-300 sm:rounded-250 sm:border sm:border-gray-200 sm:shadow-lg">
        <HomeFeedBody
          audience="guest"
          feed={feed}
          sort={sort}
          onSortChange={setSort}
          hasNextPage={false}
          isFetchingNextPage={false}
          onLoadMore={() => undefined}
          publicInsights={publicFeed.topInsights}
          guestRoomLimit={roomLimit}
        />
      </main>
    </div>
  );
}

export function HomeFeedBody({
  feed,
  sort,
  onSortChange,
  searchQuery,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  audience = 'member',
  publicInsights = [],
  guestRoomLimit = 3,
}: {
  feed: HomeFeedData;
  sort: HomeDiscoverySort;
  onSortChange: (sort: HomeDiscoverySort) => void;
  searchQuery?: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  audience?: 'guest' | 'member';
  publicInsights?: PublicHomeFeed['topInsights'];
  guestRoomLimit?: number;
}) {
  const orderedItems = [...feed.discoveryFeed.items];
  const firstInsightIndex = orderedItems.findIndex(
    (item) => item.type === 'INSIGHT_ARTICLE',
  );
  if (firstInsightIndex > 2) {
    const [firstInsight] = orderedItems.splice(firstInsightIndex, 1);
    if (firstInsight) {
      orderedItems.splice(2, 0, firstInsight);
    }
  }
  const insightForAd = orderedItems.find(
    (item): item is InsightItem => item.type === 'INSIGHT_ARTICLE',
  );
  const loadMoreRef = useIntersectionObserver(
    useCallback(() => {
      if (hasNextPage && !isFetchingNextPage) {
        onLoadMore();
      }
    }, [hasNextPage, isFetchingNextPage, onLoadMore]),
    {
      enabled: !searchQuery && hasNextPage && !isFetchingNextPage,
      rootMargin: '160px',
    },
  );

  const renderItem = (item: DiscoveryItem, index: number) =>
    item.type === 'INSIGHT_ARTICLE' ? (
      <InsightCard key={item.id} item={item} />
    ) : (
      <CommunityPostCard
        key={item.id}
        item={item}
        index={index}
        rooms={feed.myRooms}
        audience={audience}
      />
    );

  return (
    <>
      {/* 비회원 홈과 같은 이유로 본문 폭 안에 가둔다(위 주석 참조).
          화면 끝까지 늘리면 원본이 과확대돼 사진이 검게 보인다.
          폭은 정의된 토큰 max-w-page 를 쓴다. 예전에 쓰던 max-w-14750 은
          --spacing-14750 이 없어 CSS 가 방출되지 않는 죽은 클래스였고,
          그걸 쓰면 래퍼가 아무것도 가두지 못한다(2026-08-19 dev 실측). */}
      <div className="mx-auto w-full max-w-page">
        <HomeHeroBanner />
      </div>
      <div className="mx-auto grid w-full max-w-page items-start py-225 lg:grid-cols-[minmax(0,1fr)_var(--spacing-4000)] lg:gap-300 lg:px-350 lg:py-275">
        <div className="min-w-0 px-200 md:px-300 lg:px-0">
          {searchQuery ? (
            <SearchResults query={searchQuery} />
          ) : (
            <div className="space-y-300 lg:space-y-400">
              <div className="lg:hidden">
                <h2 className="font-designer-24b text-text-strong break-keep">
                  오늘의 출발점
                </h2>
                <p className="font-designer-14r text-text-subtle mt-50 break-keep">
                  필요한 순간에 읽고, 묻고, 배울 수 있어요.
                </p>
              </div>
              <TrendingStrip
                items={feed.discoveryFeed.items}
                rooms={feed.myRooms}
              />
              <div className="z-20 lg:sticky lg:top-950">
                <SortBar
                  sort={sort}
                  onSortChange={onSortChange}
                  audience={audience}
                />
              </div>

              {feed.discoveryFeed.items.length === 0 ? (
                <div className="rounded-200 border border-dashed border-home-card-line bg-white p-250 text-center">
                  <p className="text-[15px] font-extrabold text-gray-900">
                    아직 올라온 글이 없어요
                  </p>
                  <p className="mt-75 font-designer-13m leading-[1.6] font-medium text-gray-600 max-lg:font-designer-16r">
                    방에 정착하면 그 방 사람들의 글이 여기에 먼저 보여요.
                  </p>
                  <Link
                    href="/community"
                    className="mt-175 inline-flex min-h-550 items-center rounded-150 bg-gray-900 px-200 font-designer-13b font-extrabold text-white max-lg:font-designer-16m"
                  >
                    방 둘러보기
                  </Link>
                </div>
              ) : (
                <div className="space-y-300 lg:space-y-400">
                  {orderedItems.map((item, index) => (
                    <Fragment key={item.id}>
                      {renderItem(item, index)}
                      {index === 2 && (
                        <FreshPosts
                          items={feed.discoveryFeed.items}
                          rooms={feed.myRooms}
                        />
                      )}
                      {(index + 1) % 5 === 0 && (
                        <AdSlot insight={insightForAd} />
                      )}
                    </Fragment>
                  ))}
                </div>
              )}

              <div
                ref={loadMoreRef as RefObject<HTMLDivElement>}
                className="py-200 text-center font-designer-12b font-bold text-gray-500 max-lg:font-designer-16r"
                data-testid="home-feed-load-more"
              >
                {isFetchingNextPage ? (
                  <LoaderCircle className="mx-auto size-250 animate-spin" />
                ) : hasNextPage ? (
                  '아래로 내리면 계속 이어져요'
                ) : feed.discoveryFeed.items.length > 0 ? (
                  <>
                    여기까지가 최근에 올라온 글이에요
                    <span className="mt-75 block font-designer-12m font-semibold text-gray-400 max-lg:font-designer-16r">
                      더 보고 싶으면 방에 들어가 보세요. 방 안에는 여기 안 뜨는
                      글도 있어요.
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <aside className="home-sticky-rail space-y-150 px-175 pt-300 pb-300 sm:px-200 md:px-300 lg:sticky lg:top-950 lg:overflow-y-auto lg:px-0 lg:pt-0">
          {audience === 'guest' ? (
            <>
              <PublicInsightRail items={publicInsights} />
              <GuestRoomRail roomLimit={guestRoomLimit} />
            </>
          ) : (
            <>
              <InsightRail items={feed.discoveryFeed.items} />
              <ActivityCard feed={feed} />
              <PopularRooms rooms={feed.myRooms} />
              <NewMembersCard week={feed.newMembersWeek} />
              <AdSlot insight={insightForAd} />
            </>
          )}
        </aside>
      </div>
    </>
  );
}

export function HomeFeedLoading() {
  return (
    <div className="min-h-screen bg-gray-100 px-200 py-400 text-gray-900">
      <div className="mx-auto flex max-w-7600 flex-col items-center justify-center gap-150 rounded-200 border border-gray-200 bg-white p-500 text-[14px] font-semibold text-gray-600">
        <LogoLoading label="오늘의 피드를 불러오는 중이에요" />
        <p>오늘의 피드를 불러오는 중이에요.</p>
      </div>
    </div>
  );
}

export function HomeFeedUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-testid="route-error"
      className="min-h-screen bg-gray-100 px-200 py-400 text-gray-900"
    >
      <div className="mx-auto max-w-7600 rounded-200 border border-gray-200 bg-white p-250 text-center">
        <h1 className="text-[20px] font-bold">홈 정보를 불러오지 못했어요</h1>
        <p className="mt-100 text-[14px] text-gray-600">
          잠시 후 다시 시도해주세요.
        </p>
        <Button
          type="button"
          color="primary"
          size="large"
          onClick={onRetry}
          icon={<RotateCw className="size-175" aria-hidden />}
          className="mt-200 h-auto rounded-125 py-100 font-designer-14b"
        >
          다시 시도
        </Button>
      </div>
    </div>
  );
}

function AnonymousSearchFeed({ query }: { query: string }) {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <main className="mx-auto w-full max-w-16000 overflow-hidden bg-gray-50 sm:my-300 sm:rounded-250 sm:border sm:border-gray-200 sm:shadow-lg">
        <HomeHeroBanner />
        <div className="mx-auto grid w-full max-w-page items-start py-225 lg:grid-cols-[minmax(0,1fr)_var(--spacing-4000)] lg:gap-300 lg:px-350 lg:py-275">
          <div className="min-w-0 px-175 sm:px-200 lg:px-0">
            <SearchResults query={query} />
          </div>
          <aside className="px-175 pt-300 sm:px-200 lg:sticky lg:top-950 lg:px-0 lg:pt-0">
            <section className="rounded-200 border border-gray-200 bg-white p-200">
              <h2 className="text-[15px] font-black text-gray-900">인사이트</h2>
              <p className="mt-100 font-designer-13m leading-[1.6] font-medium text-gray-600">
                로그인하면 내 방과 이번 주 인사이트를 검색 결과 옆에서 함께 볼
                수 있어요.
              </p>
              <Link
                href="/login"
                className="mt-175 inline-flex min-h-550 items-center rounded-150 bg-rose-500 px-175 font-designer-12b font-extrabold text-white"
              >
                카카오로 시작하기
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function HomeFeed({
  initialSearchQuery,
}: {
  initialSearchQuery?: string;
} = {}) {
  const [discoverySort, setDiscoverySort] = useState<HomeDiscoverySort>('NEW');
  const { isAuthReady, isHydrated } = useAuthReady();
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useHomeFeedQuery(isAuthReady, discoverySort);
  const loadNextPage = useCallback(() => {
    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage]);

  if (!isHydrated) {
    return <HomeFeedLoading />;
  }

  if (!isAuthReady) {
    return initialSearchQuery ? (
      <AnonymousSearchFeed query={initialSearchQuery} />
    ) : (
      <HomeFeedLoading />
    );
  }

  if (isLoading) {
    return <HomeFeedLoading />;
  }

  if (isError || !data) {
    if (initialSearchQuery) {
      return <AnonymousSearchFeed query={initialSearchQuery} />;
    }
    return <HomeFeedUnavailable onRetry={() => refetch()} />;
  }

  return (
    <div
      className="min-h-screen bg-gray-100 text-gray-900"
      aria-busy={isLoading || isFetchingNextPage}
    >
      <main className="mx-auto w-full max-w-16000 overflow-hidden bg-gray-50 sm:my-300 sm:rounded-250 sm:border sm:border-gray-200 sm:shadow-lg">
        <HomeFeedBody
          feed={data}
          sort={discoverySort}
          onSortChange={setDiscoverySort}
          searchQuery={initialSearchQuery}
          hasNextPage={Boolean(hasNextPage)}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={loadNextPage}
        />
      </main>
    </div>
  );
}
