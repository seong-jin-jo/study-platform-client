import { ArrowUp, ChevronRight, Eye, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import SaveResourceButton from '@/components/saved-resource/save-resource-button';
import { SAVED_RESOURCE_TYPE } from '@/types/saved-resource';

interface HomeFeedCardProps extends ComponentPropsWithoutRef<'article'> {
  isMyRoom?: boolean;
}

export default function HomeFeedCard({
  className,
  isMyRoom = false,
  ...props
}: HomeFeedCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col border-y border-home-card-line bg-background-default px-225 py-225 sm:rounded-200 sm:border lg:px-275 lg:py-275',
        isMyRoom && 'border-l-4 border-l-border-brand',
        className,
      )}
      {...props}
    />
  );
}

export function formatHomeFeedTime(value: string | undefined): string {
  if (!value) {
    return '최근';
  }

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return '최근';
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - createdAt.getTime()) / 60_000),
  );
  if (elapsedMinutes < 1) return '방금 전';
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;
  if (elapsedMinutes < 60 * 24) {
    return `${Math.floor(elapsedMinutes / 60)}시간 전`;
  }
  if (elapsedMinutes < 60 * 24 * 7) {
    return `${Math.floor(elapsedMinutes / (60 * 24))}일 전`;
  }

  return createdAt.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  });
}

export interface HomeFeedCommunityCardData {
  resourceKey: string;
  href: string;
  roomHref?: string;
  roomName?: string | null;
  roomAvatarUrl?: string | null;
  roomMemberAvatarUrls?: string[];
  roomMemberCount?: number | null;
  roomJoined?: boolean | null;
  createdAt?: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  title: string;
  preview?: string | null;
  thumbnailUrl?: string | null;
  helpfulCount?: number | null;
  commentCount?: number | null;
  viewCount?: number | null;
}

interface HomeFeedCommunityPostCardProps {
  ariaLabel?: string;
  data: HomeFeedCommunityCardData;
  testId?: string;
}

function AuthorAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <span className="relative size-225 flex-none overflow-hidden rounded-full bg-gray-100">
        <Image
          src={avatarUrl}
          alt=""
          fill
          sizes="18px"
          unoptimized
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className="font-designer-10b inline-flex size-225 flex-none items-center justify-center rounded-full bg-background-neutral-subtle text-text-subtle"
      aria-hidden="true"
    >
      {name.trim().charAt(0)}
    </span>
  );
}

function RoomMemberAvatars({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;

  return (
    <span className="flex flex-none" aria-hidden="true">
      {urls.slice(0, 3).map((url, index) => (
        <span
          key={url}
          className={cn(
            'relative size-225 overflow-hidden rounded-full border-2 border-white',
            index > 0 && '-ml-75',
          )}
        >
          <Image
            src={url}
            alt=""
            fill
            sizes="18px"
            unoptimized
            className="object-cover"
          />
        </span>
      ))}
    </span>
  );
}

export function HomeFeedCommunityPostCard({
  ariaLabel,
  data,
  testId = 'home-feed-card',
}: HomeFeedCommunityPostCardProps) {
  const memberAvatars = data.roomMemberAvatarUrls ?? [];
  const codeLine = data.preview?.match(
    /(ERROR:[^\n]+|[A-Z_]+Error:[^\n]+|blocked by [^\n]+)/i,
  )?.[0];
  const showRoomLine = Boolean(data.roomName);

  return (
    <HomeFeedCard
      isMyRoom={data.roomJoined === true}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      {showRoomLine ? (
        <div
          role="group"
          aria-label="출처 방"
          className="flex flex-wrap items-center gap-100 border-b border-gray-200 pb-125"
        >
          {data.roomAvatarUrl ? (
            <span className="relative block size-275 flex-none overflow-hidden rounded-full bg-background-neutral-subtle">
              <Image
                src={data.roomAvatarUrl}
                alt={`${data.roomName} 방 아바타`}
                fill
                sizes="22px"
                unoptimized
                className="object-cover"
              />
            </span>
          ) : null}
          <div className="flex min-w-0 items-center gap-75">
            {data.roomHref ? (
              <Link
                href={data.roomHref}
                className="inline-flex items-center truncate font-designer-14b text-text-strong hover:text-text-brand max-lg:min-h-550"
              >
                {data.roomName}
              </Link>
            ) : (
              <span className="font-designer-14b truncate text-text-strong">
                {data.roomName}
              </span>
            )}
            <span className="font-designer-11b rounded-full bg-background-neutral-subtle px-75 py-25 text-text-subtle">
              방
            </span>
            <RoomMemberAvatars urls={memberAvatars} />
          </div>
          <div className="font-designer-11m ml-auto flex items-center gap-100 text-text-subtle">
            {typeof data.roomMemberCount === 'number' ? (
              <span aria-label={`방 멤버 ${data.roomMemberCount}명`}>
                멤버 {data.roomMemberCount}명
              </span>
            ) : null}
            {typeof data.roomJoined === 'boolean' ? (
              <span
                className={cn(
                  'font-designer-11b rounded-full px-100 py-50',
                  data.roomJoined
                    ? 'bg-background-accent-rose-subtle text-text-brand'
                    : 'border border-border-default text-text-default',
                )}
              >
                {data.roomJoined ? '내 방' : '입장'}
              </span>
            ) : null}
            {data.createdAt ? (
              <time dateTime={data.createdAt}>
                {formatHomeFeedTime(data.createdAt)}
              </time>
            ) : null}
          </div>
        </div>
      ) : null}

      {data.authorName ? (
        <div
          role="group"
          aria-label={`글쓴이 ${data.authorName}`}
          className="font-designer-11m mt-150 flex items-center gap-75 text-text-subtle"
        >
          <AuthorAvatar
            name={data.authorName}
            avatarUrl={data.authorAvatarUrl}
          />
          <span
            title={data.authorName}
            className="font-designer-12b max-w-1500 min-w-0 truncate text-text-strong"
          >
            {data.authorName}
          </span>
          <span>멤버</span>
          {(data.commentCount ?? 0) > 0 ? (
            <span className="font-designer-12b ml-auto rounded-full bg-background-accent-rose-subtle px-125 py-50 text-text-brand-strong max-lg:font-designer-16m">
              답변 달리는 중
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-125 flex gap-125">
        <div className="min-w-0 flex-1">
          <Link
            href={data.href}
            className="font-designer-16b line-clamp-2 block min-h-550 text-text-strong hover:text-text-brand"
          >
            {data.title}
          </Link>
          {data.preview?.trim() ? (
            <p className="font-designer-13m mt-100 line-clamp-3 max-h-home-preview-mobile text-text-subtle max-lg:font-designer-16r lg:line-clamp-4 lg:max-h-home-preview-desktop">
              {data.preview.trim()}
            </p>
          ) : null}
        </div>
        {data.thumbnailUrl ? (
          <Link
            href={data.href}
            className="relative mt-25 h-800 w-1100 flex-none overflow-hidden rounded-150 border border-border-subtle"
            aria-label={`${data.title} 읽기`}
          >
            <Image
              src={data.thumbnailUrl}
              alt=""
              fill
              sizes="88px"
              unoptimized
              className="object-cover"
            />
          </Link>
        ) : null}
      </div>

      {codeLine ? (
        <pre className="font-designer-11m mt-75 overflow-hidden text-ellipsis whitespace-nowrap rounded-125 bg-gray-950 px-125 py-100 text-green-300">
          {codeLine}
        </pre>
      ) : null}

      <div
        role="group"
        aria-label="글 반응"
        className="font-designer-13b mt-200 flex items-center gap-100 border-t border-border-subtle pt-150 text-text-subtle"
      >
        {typeof data.helpfulCount === 'number' ? (
          <span className="inline-flex items-center gap-50 max-lg:font-designer-16m">
            <ArrowUp className="size-150 text-icon-brand" aria-hidden="true" />
            도움됨 {data.helpfulCount}
          </span>
        ) : null}
        {typeof data.commentCount === 'number' ? (
          <Link
            href={data.href}
            className="inline-flex min-h-550 min-w-550 items-center gap-50 hover:text-text-default max-lg:font-designer-16m"
          >
            <MessageCircle className="size-150" aria-hidden="true" />
            댓글 {data.commentCount}
          </Link>
        ) : null}
        <SaveResourceButton
          className="ml-auto"
          resourceKey={data.resourceKey}
          resourceType={SAVED_RESOURCE_TYPE.COMMUNITY_POST}
          showLabel={true}
        />
      </div>

      {typeof data.viewCount === 'number' ? (
        <div className="mt-100 flex items-center gap-75">
          <RoomMemberAvatars urls={memberAvatars.slice(0, 4)} />
          <p className="font-designer-11m min-w-0 flex-1 text-text-subtle max-lg:font-designer-16r">
            <b className="font-designer-11b text-text-default">
              {data.viewCount}명이 다녀갔어요
            </b>{' '}
            · 최근 같은 방 멤버가 답을 보고 있어요
          </p>
        </div>
      ) : null}
    </HomeFeedCard>
  );
}

export interface HomeFeedInsightCardData {
  resourceKey: string;
  href: string;
  title: string;
  coverUrl?: string | null;
  categoryLabel?: string | null;
  viewCount?: number | null;
  helpfulCount?: number | null;
}

export function HomeFeedInsightCard({
  ariaLabel,
  data,
  showSavedIndicator = false,
  testId,
}: {
  ariaLabel?: string;
  data: HomeFeedInsightCardData;
  showSavedIndicator?: boolean;
  testId?: string;
}) {
  return (
    <article
      className="flex items-center gap-150 bg-linear-to-br from-gray-900 to-gray-800 px-175 py-150 text-white sm:rounded-150"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {data.coverUrl ? (
        <Link
          href={data.href}
          className="relative size-700 flex-none overflow-hidden rounded-125 border border-white/10 bg-white"
          aria-label={`${data.title} 읽기`}
        >
          <Image
            src={data.coverUrl}
            alt=""
            fill
            sizes="56px"
            unoptimized
            className="object-cover"
          />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <span className="font-designer-10b inline-flex rounded-full bg-rose-500/30 px-100 py-25 text-rose-100">
          인사이트 · {data.categoryLabel?.trim() || '탐험 지도'}
        </span>
        <Link
          href={data.href}
          className="font-designer-14b mt-50 line-clamp-2 block min-h-550"
        >
          {data.title}
        </Link>
        {typeof data.viewCount === 'number' ||
        typeof data.helpfulCount === 'number' ? (
          <div className="font-designer-11m mt-50 flex flex-wrap items-center gap-75 text-white/55">
            {typeof data.viewCount === 'number' ? (
              <span>
                <Eye className="mr-25 inline size-150" aria-hidden="true" />
                {data.viewCount}명이 봤어요
              </span>
            ) : null}
            {typeof data.helpfulCount === 'number' ? (
              <span>도움됨 {data.helpfulCount}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {showSavedIndicator ? (
        <SaveResourceButton
          resourceKey={data.resourceKey}
          resourceType={SAVED_RESOURCE_TYPE.INSIGHT_ARTICLE}
          showLabel={true}
          className="border-white/20 text-white hover:bg-white/10 hover:text-white"
        />
      ) : (
        <ChevronRight
          className="size-200 flex-none text-white/35"
          aria-hidden="true"
        />
      )}
    </article>
  );
}
