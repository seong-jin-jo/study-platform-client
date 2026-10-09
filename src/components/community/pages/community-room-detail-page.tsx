'use client';

import {
  ChevronLeft,
  CircleAlert,
  Crown,
  Eye,
  Flame,
  HandHeart,
  House,
  MessageCircle,
  PenLine,
  RefreshCw,
  Search,
  ThumbsUp,
  User,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode, Suspense, useEffect, useMemo, useState } from 'react';
import LoginModal from '@/components/auth/modals/login-modal';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import IconButton from '@/components/common/ui/icon-button';
import { BaseInput } from '@/components/common/ui/input';
import { Modal } from '@/components/common/ui/modal';
import PageContainer from '@/components/common/ui/page-container';
import ToggleButton from '@/components/common/ui/toggle/button';
import JoinCommunityRoomModal from '@/components/community/modals/join-community-room-modal';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { buildCommunityRoomWriteHref } from '@/features/community/model/community-route';
import CommunityAuthorNameTrigger from '@/features/community/ui/community-author-name-trigger';
import { useSeoHydrationReady } from '@/features/seo/ui/seo-hydration-boundary';
import {
  useClaimCommunityRoomOwnershipMutation,
  useCommunityRoomDetailQuery,
  useCommunityRoomHubQuery,
  useLeaveCommunityRoomMutation,
} from '@/hooks/queries/community/use-community-room-hub-query';
import {
  useCommunityRoomPostSearchQuery,
  useCommunityRoomPostsQuery,
  useToggleCommunityPostHelpfulMutation,
} from '@/hooks/queries/community/use-community-room-posts-query';
import { useInsightMapQuery } from '@/hooks/queries/insights/use-insight-worldmap-query';
import { useDebounce } from '@/hooks/use-debounce';
import { useToastStore } from '@/stores/use-toast-store';
import type {
  CommunityPostSort,
  CommunityPostSummary,
} from '@/types/community/post';
import type {
  CommunityRoomAxis,
  CommunityRoomSummary,
} from '@/types/community/room-hub';
import type { InsightMap } from '@/types/insight-worldmap';
import { analyzeError } from '@/utils/error-handler';

const HELPFUL_POST_IDS_STORAGE_KEY = 'zero-one.community.helpful-post-ids';

const AXIS_CLASS: Record<CommunityRoomAxis, string> = {
  JOB: 'bg-background-accent-blue-subtle text-text-information',
  GOAL: 'bg-background-accent-rose-subtle text-text-brand',
  LEVEL: 'bg-background-accent-green-subtle text-text-success',
};

const getPostThumbnail = (post: CommunityPostSummary) =>
  post.previewImageUrl?.trim() || undefined;

const readHelpfulPostIds = () => {
  if (typeof window === 'undefined') return new Set<number>();

  try {
    const storedIds = JSON.parse(
      window.localStorage.getItem(HELPFUL_POST_IDS_STORAGE_KEY) ?? '[]',
    );

    return new Set<number>(
      Array.isArray(storedIds)
        ? storedIds.filter(
            (postId): postId is number =>
              Number.isSafeInteger(postId) && postId > 0,
          )
        : [],
    );
  } catch {
    return new Set<number>();
  }
};

const persistHelpfulPost = (postId: number, helpful: boolean) => {
  try {
    const next = readHelpfulPostIds();
    if (helpful) next.add(postId);
    else next.delete(postId);

    window.localStorage.setItem(
      HELPFUL_POST_IDS_STORAGE_KEY,
      JSON.stringify([...next]),
    );
  } catch {
    // 저장소를 사용할 수 없어도 서버의 도움됨 변경은 유지한다.
  }
};

const formatCreatedAt = (createdAt: string) => {
  const date = new Date(createdAt);

  return Number.isNaN(date.getTime())
    ? '작성 시각을 확인할 수 없어요'
    : date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
      });
};

const sortPosts = (posts: CommunityPostSummary[], sort: CommunityPostSort) =>
  posts.slice().sort((left, right) => {
    if (sort === 'popular' && right.stats.likeCount !== left.stats.likeCount) {
      return right.stats.likeCount - left.stats.likeCount;
    }

    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });

const RoomState = ({
  testId,
  title,
  description,
  action,
  compact = false,
}: {
  testId: string;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) => (
  <section
    data-testid={testId}
    className={cn(
      'border-border-subtle bg-background-default rounded-200 flex flex-col items-center gap-125 border text-center',
      compact ? 'p-250' : 'p-400',
    )}
  >
    <h1 className="font-designer-20b text-text-strong">{title}</h1>
    <p className="font-designer-14r text-text-subtle max-w-xl">{description}</p>
    {action}
  </section>
);

const PostCard = ({
  post,
  helpful,
  isPreview = false,
  onToggleHelpful,
  pending,
}: {
  post: CommunityPostSummary;
  helpful: boolean;
  isPreview?: boolean;
  onToggleHelpful: (postId: number, currentHelpful: boolean) => void;
  pending: boolean;
}) => {
  const thumbnail = getPostThumbnail(post);
  const authorProfileImageUrl = post.author.profileImageUrl?.trim();

  return (
    <article className="border-border-subtle bg-background-default rounded-200 group flex overflow-hidden border transition-colors hover:border-border-default">
      <div className="bg-background-alternative flex w-500 shrink-0 flex-col items-center gap-25 py-125">
        {isPreview ? (
          <ThumbsUp
            className="text-text-subtlest mt-75 size-175"
            aria-hidden="true"
          />
        ) : (
          <IconButton
            data-testid={`community-post-helpful-${post.postId}`}
            label={`도움됨 ${post.stats.likeCount}`}
            aria-pressed={helpful}
            disabled={pending}
            tone="ghost"
            size="xs"
            className={cn(
              'size-325 disabled:opacity-60',
              helpful
                ? 'bg-background-accent-rose-subtle text-text-brand'
                : 'text-text-subtlest hover:bg-background-accent-rose-subtle hover:text-text-brand',
            )}
            onClick={() => onToggleHelpful(post.postId, helpful)}
          >
            <ThumbsUp className="size-175" aria-hidden="true" />
            <span className="sr-only">도움됨 {post.stats.likeCount}</span>
          </IconButton>
        )}
        <strong className="font-designer-12b text-text-strong tabular-nums">
          {post.stats.likeCount}
        </strong>
        <span className="font-designer-10b text-text-subtlest">도움됨</span>
      </div>

      <div className="min-w-0 flex-1 px-225 py-225 lg:px-275 lg:py-275">
        <div className="flex flex-wrap items-center gap-50">
          {!authorProfileImageUrl && (
            <span
              role="img"
              aria-label={`${post.author.name} 프로필`}
              className="font-designer-10b bg-background-disabled text-text-subtle flex size-250 items-center justify-center rounded-full"
            >
              <User className="size-150" aria-hidden="true" />
            </span>
          )}
          <CommunityAuthorNameTrigger
            memberId={post.author.memberId}
            publicProfileUuid={post.author.publicProfileUuid ?? undefined}
            name={post.author.name}
            image={authorProfileImageUrl}
            imageSize={20}
            className="font-designer-11b text-text-strong"
          />
          <span className="font-designer-11m text-text-subtlest">
            · {formatCreatedAt(post.createdAt)}
          </span>
          <span className="font-designer-10b bg-background-accent-gray-subtle text-text-subtle rounded-full px-100 py-25">
            {post.board}
          </span>
        </div>

        <div className="mt-75 flex gap-125">
          <div className="min-w-0 flex-1">
            <Link
              href={`/community/${post.postId}`}
              className="font-designer-16b text-text-strong group-hover:text-text-brand block transition-colors"
            >
              {post.title}
            </Link>
            <p className="font-designer-12r text-text-subtle mt-50 line-clamp-2 leading-relaxed">
              {post.excerpt || '본문 미리보기를 준비하고 있어요.'}
            </p>
          </div>
          {thumbnail && (
            <Image
              src={thumbnail}
              width={88}
              height={64}
              alt={post.previewImageAlt || `${post.title} 미리보기`}
              unoptimized
              className="border-border-subtle bg-background-disabled hidden h-800 w-1100 shrink-0 rounded-150 border object-cover sm:block"
            />
          )}
        </div>

        <div className="font-designer-11m text-text-subtlest mt-100 flex flex-wrap items-center gap-125">
          <span className="flex items-center gap-50">
            <MessageCircle className="size-150" aria-hidden="true" />
            댓글 {post.stats.commentCount}
          </span>
          <span className="flex items-center gap-50">
            <Eye className="size-150" aria-hidden="true" />
            조회 {post.stats.viewCount}
          </span>
        </div>
      </div>
    </article>
  );
};

const LeaveRoomModal = ({
  isPending,
  onLeave,
}: {
  isPending: boolean;
  onLeave: () => void;
}) => (
  <Modal.Root>
    <Modal.Trigger asChild>
      <Button color="outlined" size="medium" data-testid="community-room-leave">
        이 방 나가기
      </Button>
    </Modal.Trigger>
    <Modal.Portal>
      <Modal.Overlay className="opacity-60" />
      <Modal.Content
        description="방을 나가기 전 확인"
        className="max-w-md rounded-250"
      >
        <Modal.Header variant="form" className="px-250 pt-250 pb-175">
          <Modal.Title>이 방에서 나갈까요?</Modal.Title>
          <Modal.CloseButton aria-label="닫기" className="size-550" />
        </Modal.Header>
        <Modal.Body variant="form" className="px-250 py-200">
          <div className="border-border-brand bg-background-default rounded-150 border border-l-4 p-175">
            <h2 className="font-designer-14b text-text-strong">
              방장으로 나가면 이 방은 방장이 없는 상태로 남아요
            </h2>
            <p className="font-designer-13r text-text-subtle mt-75 leading-relaxed">
              다른 사람이 먼저 맡으면 그 사람이 방장이 됩니다. 방은 없어지지
              않고 목록에 그대로 남아요. 내가 쓴 글과 답도 그대로 남습니다.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer variant="form" className="px-250 py-175">
          <Modal.Close asChild>
            <Button color="outlined" size="medium">
              그대로 둘래요
            </Button>
          </Modal.Close>
          <Button
            color="primary"
            size="medium"
            disabled={isPending}
            data-testid="community-room-leave-confirm"
            onClick={onLeave}
          >
            {isPending ? '나가는 중' : '나가기'}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Portal>
  </Modal.Root>
);

export const resolveRoomInsightIsland = (
  insightMap: InsightMap | undefined,
  roomId: number,
) =>
  insightMap?.islands.find((island) => island.bridgeRoomId === roomId) ?? null;

export const CommunityRoomEntryContext = ({ roomId }: { roomId: number }) => {
  const mapQuery = useInsightMapQuery();
  const island = resolveRoomInsightIsland(mapQuery.data, roomId);

  if (!island) return null;

  return (
    <p
      data-testid="community-room-entry-context"
      className="font-designer-12b text-text-subtle"
    >
      {island.name} 개척지에서 들어왔습니다
    </p>
  );
};

export type RoomMemberRailState = 'loading' | 'populated' | 'alone' | 'empty';

export const resolveRoomMemberRailState = ({
  membersProvided,
  postsPending,
  visibleMemberCount,
}: {
  membersProvided: boolean;
  postsPending: boolean;
  visibleMemberCount: number;
}): RoomMemberRailState => {
  if (!membersProvided && postsPending && visibleMemberCount === 0) {
    return 'loading';
  }
  if (visibleMemberCount > 1) return 'populated';
  if (visibleMemberCount === 1) return 'alone';
  return 'empty';
};

const CommunityRoomHeroActions = ({
  action,
  roomId,
}: {
  action: ReactNode;
  roomId: number;
}) => {
  const mapQuery = useInsightMapQuery();
  const island = resolveRoomInsightIsland(mapQuery.data, roomId);

  return (
    <div className="flex min-h-1250 w-full flex-col gap-75 sm:w-auto">
      {action}
      {island && (
        <Button asChild color="outlined" size="medium">
          <Link
            href={`/insights/land/${island.slug}`}
            data-testid="community-room-insight-articles-link"
          >
            {island.name} 개념글 {island.articles.length}편
          </Link>
        </Button>
      )}
    </div>
  );
};

const RoomHero = ({
  room,
  action,
}: {
  room: CommunityRoomSummary;
  action?: ReactNode;
}) => {
  const bannerUrl = room.bannerUrl?.trim();

  return (
    <header className="border-border-subtle bg-background-default rounded-250 overflow-hidden border">
      {bannerUrl && (
        <div
          className="bg-background-disabled relative h-1250 sm:h-1750"
          data-testid="community-room-detail-media"
        >
          <Image
            src={bannerUrl}
            alt={`${room.name} 배너`}
            fill
            sizes="100vw"
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          <p className="font-designer-12b text-text-inverse absolute right-175 bottom-125 left-175 line-clamp-1 rounded-full bg-black/45 px-125 py-50 backdrop-blur-sm sm:right-auto">
            {room.description}
          </p>
        </div>
      )}
      <div className="relative p-200 sm:p-250">
        <div className="flex flex-col gap-150 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-50 min-h-225">
              <Suspense fallback={null}>
                <CommunityRoomEntryContext roomId={room.roomId} />
              </Suspense>
            </div>
            <h1 className="font-designer-28b text-text-strong">{room.name}</h1>
            {!bannerUrl && (
              <p className="font-designer-13r text-text-subtle mt-75 max-w-2xl">
                {room.description}
              </p>
            )}
            <p className="font-designer-13m text-text-subtle mt-50 flex flex-wrap items-center gap-75">
              <span className="inline-flex items-center gap-50">
                <Users className="size-150" aria-hidden="true" />
                멤버 {room.memberCount.toLocaleString()}명
              </span>
              <span aria-hidden="true">·</span>
              <span>최근 7일 글 {room.stats.postCount7d}개</span>
              <span aria-hidden="true">·</span>
              <span>댓글 {room.stats.commentCount7d}개</span>
            </p>
            <div className="mt-100 flex flex-wrap gap-50">
              {room.axisTags.map((tag) => (
                <span
                  key={`${tag.axis}-${tag.code}`}
                  className={cn(
                    'font-designer-11b rounded-full px-100 py-50',
                    tag.axis
                      ? AXIS_CLASS[tag.axis]
                      : 'bg-background-accent-gray-subtle text-text-subtle',
                  )}
                >
                  {tag.label}
                </span>
              ))}
              {room.liveSignal && (
                <span className="font-designer-11b bg-fill-success-subtle-default text-text-success inline-flex items-center gap-50 rounded-full px-100 py-50">
                  <span className="bg-fill-success-default-default size-75 rounded-full" />
                  오늘 대화 중
                </span>
              )}
            </div>
          </div>
          {action && (
            <div className="shrink-0">
              <Suspense fallback={action}>
                <CommunityRoomHeroActions
                  action={action}
                  roomId={room.roomId}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default function CommunityRoomDetailPage({
  roomId,
}: {
  roomId: number;
}) {
  const [sort, setSort] = useState<CommunityPostSort>('popular');
  const [searchInput, setSearchInput] = useState('');
  const [helpfulPostIds, setHelpfulPostIds] = useState<Set<number>>(new Set());
  const [ownershipMessage, setOwnershipMessage] = useState<string>();
  const debouncedSearch = useDebounce(searchInput);
  const showToast = useToastStore((state) => state.showToast);
  const { isAuthenticated } = useAuthReady();
  const roomQuery = useCommunityRoomDetailQuery(roomId);
  const roomHubQuery = useCommunityRoomHubQuery({});
  const leaveMutation = useLeaveCommunityRoomMutation();
  const claimOwnershipMutation = useClaimCommunityRoomOwnershipMutation();
  const room = roomQuery.data;
  const isMember = room?.membership.state === 'ACTIVE';
  const postsQuery = useCommunityRoomPostsQuery(roomId, Boolean(room));
  const searchQuery = useCommunityRoomPostSearchQuery(
    roomId,
    debouncedSearch,
    sort,
    isMember,
  );
  const helpfulMutation = useToggleCommunityPostHelpfulMutation();
  useSeoHydrationReady(!roomQuery.isLoading && !postsQuery.isLoading);

  useEffect(() => {
    setHelpfulPostIds(readHelpfulPostIds());
  }, []);

  const isSearching = debouncedSearch.trim().length > 0;
  const allDisplayedPosts = useMemo(
    () =>
      sortPosts(
        isSearching
          ? (searchQuery.data?.items ?? [])
          : (postsQuery.data?.items ?? []),
        sort,
      ),
    [isSearching, postsQuery.data?.items, searchQuery.data?.items, sort],
  );
  const displayedPosts = isMember
    ? allDisplayedPosts
    : allDisplayedPosts.slice(0, 3);
  const visibleMembers = useMemo(() => {
    if (room?.members?.items.length) return room.members.items;

    const seen = new Set<string>();
    return (postsQuery.data?.items ?? []).flatMap((post) => {
      const publicProfileUuid = post.author.publicProfileUuid;
      if (!publicProfileUuid || seen.has(publicProfileUuid)) return [];
      seen.add(publicProfileUuid);

      return [
        {
          publicProfileUuid,
          nickname: post.author.name,
          profileImageUrl: post.author.profileImageUrl,
          joinedAt: post.createdAt,
          newcomer: false,
        },
      ];
    });
  }, [postsQuery.data?.items, room?.members?.items]);
  const recentMembers = visibleMembers.filter((member) => member.newcomer);
  const memberRailState = resolveRoomMemberRailState({
    membersProvided: room?.members !== undefined,
    postsPending: postsQuery.isLoading,
    visibleMemberCount: visibleMembers.length,
  });
  const ownerMember = visibleMembers.find(
    (member) =>
      member.publicProfileUuid === room?.ownership?.ownerPublicProfileUuid,
  );

  const handleClaimOwnership = async () => {
    if (!room?.ownership) return;
    setOwnershipMessage(undefined);

    try {
      await claimOwnershipMutation.mutateAsync({
        roomId,
        expectedRevision: room.ownership.revision,
      });
      setOwnershipMessage(
        '이 방을 맡았어요. 방 피드에 안내 글이 올라갔습니다.',
      );
      await roomQuery.refetch();
    } catch (error) {
      const errorInfo = analyzeError(error);
      const lostRace = [
        'CMT025',
        'CMT029',
        'OWNERSHIP_ALREADY_CLAIMED',
        'ROOM_REVISION_CONFLICT',
      ].includes(errorInfo.errorCode ?? '');
      setOwnershipMessage(
        lostRace
          ? '다른 멤버가 먼저 이 방을 맡았어요. 새 방장 정보를 다시 불러왔습니다.'
          : '방을 맡지 못했어요. 방 상태를 다시 확인해 주세요.',
      );
      await roomQuery.refetch();
    }
  };
  const handleToggleHelpful = (postId: number, currentHelpful: boolean) => {
    const nextHelpful = !currentHelpful;

    setHelpfulPostIds((current) => {
      const next = new Set(current);
      if (nextHelpful) next.add(postId);
      else next.delete(postId);
      return next;
    });

    helpfulMutation.mutate(
      { postId, helpful: nextHelpful },
      {
        onSuccess: (response) => {
          persistHelpfulPost(postId, response.helpful);
          setHelpfulPostIds((current) => {
            const next = new Set(current);
            if (response.helpful) next.add(postId);
            else next.delete(postId);
            return next;
          });
        },
        onError: () => {
          setHelpfulPostIds((current) => {
            const next = new Set(current);
            if (currentHelpful) next.add(postId);
            else next.delete(postId);
            return next;
          });
          showToast(
            '도움됨 표시를 바꾸지 못했어요. 다시 시도해 주세요.',
            'error',
          );
        },
      },
    );
  };

  if (roomQuery.isLoading) {
    return (
      <PageContainer className="flex flex-col gap-300">
        <div className="bg-background-disabled rounded-200 h-400 animate-pulse" />
        <div className="bg-background-disabled rounded-200 h-600 animate-pulse" />
      </PageContainer>
    );
  }

  if (roomQuery.isError) {
    return (
      <PageContainer>
        <RoomState
          testId="community-room-error"
          title="방 정보를 불러오지 못했어요"
          description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
          action={
            <Button
              color="outlined"
              size="medium"
              icon={<RefreshCw />}
              onClick={() => roomQuery.refetch()}
            >
              다시 시도
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (!room) {
    return (
      <PageContainer>
        <RoomState
          testId="community-room-not-found"
          title="방을 찾을 수 없어요"
          description="초대 링크가 만료됐거나 아직 열리지 않은 방이에요."
          action={
            <Button asChild color="outlined" size="medium">
              <Link href="/community">방 목록으로 돌아가기</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const activeQuery = isSearching ? searchQuery : postsQuery;
  const joinButton = (
    <Button
      color="primary"
      size="large"
      data-testid="community-room-detail-join"
    >
      이 방에 정착하기
    </Button>
  );
  return (
    <PageContainer
      data-testid="community-room-detail"
      className="flex flex-col gap-150 sm:gap-200"
    >
      <Link
        href="/community"
        className="font-designer-13b text-text-subtle hover:text-text-strong flex w-fit items-center gap-50"
      >
        <ChevronLeft className="size-150" aria-hidden="true" />방 목록
      </Link>

      <RoomHero
        room={room}
        action={
          isMember ? (
            <Button asChild color="primary" size="medium" className="gap-75">
              <Link
                href={buildCommunityRoomWriteHref(roomId)}
                data-testid="community-room-write-link"
              >
                <PenLine className="size-200" aria-hidden="true" />
                <span>질문 쓰기</span>
              </Link>
            </Button>
          ) : isAuthenticated ? (
            <JoinCommunityRoomModal
              room={room}
              activeRoomCount={roomHubQuery.data?.activeRoomCount ?? 0}
              activeRoomLimit={roomHubQuery.data?.activeRoomLimit ?? 3}
              activeRooms={roomHubQuery.data?.myRooms ?? []}
              onJoined={() => roomQuery.refetch()}
              trigger={joinButton}
            />
          ) : (
            <LoginModal openTrigger={joinButton} />
          )
        }
      />

      <div
        className={cn(
          isMember &&
            'lg:grid lg:grid-cols-content-sidebar-320 lg:items-start lg:gap-400',
        )}
      >
        <main className="min-w-0" data-testid="community-room-main">
          {isMember && (
            <section className="border-border-subtle bg-background-default rounded-200 mb-125 border p-125 sm:p-150">
              <label
                htmlFor="community-room-archive-search"
                className="font-designer-12b text-text-subtlest"
              >
                방 아카이브 검색
              </label>
              <div className="relative mt-75">
                <Search
                  className="text-text-subtlest pointer-events-none absolute top-150 left-150 size-200"
                  aria-hidden="true"
                />
                <BaseInput
                  id="community-room-archive-search"
                  value={searchInput}
                  onValueChange={setSearchInput}
                  placeholder="제목과 본문에서 검색"
                  className="rounded-full pl-500"
                />
              </div>
            </section>
          )}

          <section className="flex flex-col gap-75">
            <div className="border-border-subtle bg-background-default rounded-200 flex flex-wrap items-center justify-between gap-100 border p-100">
              <div className="flex items-center gap-75">
                <Flame
                  className="text-text-warning size-175"
                  aria-hidden="true"
                />
                <h2 className="font-designer-14b text-text-strong">
                  {isSearching ? '아카이브 검색 결과' : '이 방의 이야기'}
                </h2>
                {!isSearching && (
                  <span className="font-designer-11m text-text-subtlest">
                    {room.axisTags[0]?.label ?? room.name}을 읽다 막힌 것들
                  </span>
                )}
              </div>
              {isMember && (
                <fieldset className="flex items-center gap-25">
                  <legend className="sr-only">피드 정렬</legend>
                  {(
                    [
                      ['popular', '인기순'],
                      ['recent', '최신순'],
                    ] as const
                  ).map(([value, label]) => (
                    <ToggleButton
                      key={value}
                      data-testid={`community-room-sort-${value}`}
                      pressed={sort === value}
                      onPressedChange={() => setSort(value)}
                      color="gray"
                      size="sm"
                      variant="round"
                      className={cn(
                        'font-designer-12b border-0 px-125 py-75',
                        sort === value
                          ? 'data-[state=on]:border-0 data-[state=on]:bg-fill-neutral-default-default data-[state=on]:text-text-strong'
                          : 'data-[state=off]:border-0 data-[state=off]:bg-transparent data-[state=off]:text-text-subtlest hover:bg-fill-neutral-subtle-hover',
                      )}
                    >
                      {label}
                    </ToggleButton>
                  ))}
                </fieldset>
              )}
            </div>

            {activeQuery.isLoading && (
              <output
                data-testid="community-room-posts-loading"
                aria-label="방 피드를 불러오는 중"
                className="flex flex-col gap-75"
              >
                {['first', 'second', 'third'].map((key) => (
                  <div
                    key={key}
                    className="bg-background-disabled rounded-200 h-300 animate-pulse"
                  />
                ))}
              </output>
            )}

            {activeQuery.isError && (
              <RoomState
                testId="community-room-posts-error"
                title={
                  isSearching
                    ? '검색 결과를 불러오지 못했어요'
                    : '방 피드를 불러오지 못했어요'
                }
                description="잠시 후 다시 시도해 주세요."
                action={
                  <Button
                    color="outlined"
                    size="medium"
                    icon={<RefreshCw />}
                    onClick={() => activeQuery.refetch()}
                  >
                    다시 시도
                  </Button>
                }
              />
            )}

            {!activeQuery.isLoading &&
              !activeQuery.isError &&
              displayedPosts.length === 0 && (
                <RoomState
                  testId="community-room-posts-empty"
                  title={
                    isSearching ? '일치하는 글이 없어요' : '아직 새 글이 없어요'
                  }
                  description={
                    isSearching
                      ? '다른 검색어로 방 아카이브를 다시 찾아보세요.'
                      : '첫 질문과 작업 기록이 이 방의 다음 대화를 시작해요.'
                  }
                />
              )}

            {!activeQuery.isLoading &&
              !activeQuery.isError &&
              displayedPosts.length > 0 && (
                <div className="flex flex-col gap-300 lg:gap-400">
                  {displayedPosts.map((post) => (
                    <PostCard
                      key={post.postId}
                      post={post}
                      helpful={helpfulPostIds.has(post.postId)}
                      isPreview={!isMember}
                      pending={helpfulMutation.isPending}
                      onToggleHelpful={handleToggleHelpful}
                    />
                  ))}
                </div>
              )}
          </section>
        </main>

        {isMember && (
          <aside
            data-testid="community-room-member-rail"
            className="mt-200 flex flex-col gap-125 lg:sticky lg:top-1000 lg:mt-0 lg:self-start"
          >
            {ownerMember && (
              <section className="border-border-brand bg-background-accent-rose-subtle rounded-200 border p-175">
                <div className="flex items-center gap-125">
                  {!ownerMember.profileImageUrl?.trim() && (
                    <span
                      role="img"
                      aria-label={`${ownerMember.nickname} 프로필`}
                      className="font-designer-13b bg-background-disabled text-text-subtle flex size-475 shrink-0 items-center justify-center rounded-full"
                    >
                      <User className="size-225" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-designer-14b text-text-strong flex items-center gap-50">
                      <CommunityAuthorNameTrigger
                        publicProfileUuid={ownerMember.publicProfileUuid}
                        name={ownerMember.nickname}
                        image={ownerMember.profileImageUrl?.trim() || undefined}
                        imageSize={38}
                        className="font-designer-14b text-text-strong"
                      />
                      <span className="font-designer-10b bg-fill-brand-default-default text-text-inverse inline-flex items-center gap-25 rounded-full px-100 py-50">
                        <House className="size-125" aria-hidden="true" />
                        방장
                      </span>
                    </h2>
                    <p className="font-designer-11m text-text-subtle mt-25">
                      이 방을 열고 돌보는 사람이에요.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section
              data-testid="community-room-members"
              className="border-border-subtle bg-background-default rounded-200 border p-175"
            >
              <h2 className="font-designer-14b text-text-strong flex items-center gap-75">
                <Users className="size-175" aria-hidden="true" />
                지금 이 방 사람들{' '}
                <span className="text-text-subtlest tabular-nums">
                  {room.memberCount.toLocaleString()}
                </span>
              </h2>
              {memberRailState === 'loading' ? (
                <output
                  data-testid="community-room-members-loading"
                  aria-label="방 멤버를 불러오는 중"
                  className="mt-100 flex flex-col gap-75"
                >
                  {['first', 'second', 'third'].map((key) => (
                    <span
                      key={key}
                      className="bg-background-disabled rounded-100 h-400 animate-pulse"
                    />
                  ))}
                </output>
              ) : visibleMembers.length > 0 ? (
                <ul className="mt-100">
                  {visibleMembers.slice(0, 6).map((member) => {
                    const isOwner =
                      member.publicProfileUuid ===
                      room.ownership?.ownerPublicProfileUuid;

                    return (
                      <li
                        key={member.publicProfileUuid}
                        className="border-border-subtlest flex items-center gap-100 border-b py-100 last:border-0"
                      >
                        {!member.profileImageUrl?.trim() && (
                          <span
                            role="img"
                            aria-label={`${member.nickname} 프로필`}
                            className="font-designer-12b bg-background-disabled text-text-subtle flex size-400 shrink-0 items-center justify-center rounded-full"
                          >
                            <User className="size-175" aria-hidden="true" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <strong className="font-designer-13b text-text-strong flex items-center gap-50">
                            <CommunityAuthorNameTrigger
                              publicProfileUuid={member.publicProfileUuid}
                              name={member.nickname}
                              image={
                                member.profileImageUrl?.trim() || undefined
                              }
                              imageSize={32}
                              className="font-designer-13b text-text-strong"
                            />
                            {isOwner && (
                              <Crown
                                className="text-text-brand size-150"
                                aria-label="방장"
                              />
                            )}
                          </strong>
                          <span className="font-designer-11m text-text-subtlest mt-25 block">
                            {member.newcomer
                              ? `${formatCreatedAt(member.joinedAt)} 정착`
                              : '최근 방 글에 참여했어요'}
                          </span>
                        </span>
                        {member.newcomer && (
                          <span className="font-designer-10b bg-fill-success-subtle-default text-text-success rounded-full px-100 py-50">
                            새로 옴
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p
                  data-testid="community-room-members-empty"
                  className="font-designer-12r text-text-subtle mt-100"
                >
                  멤버 이름은 아직 불러오지 못했어요. 방 인원 수와 피드는 그대로
                  볼 수 있어요.
                </p>
              )}
              {memberRailState === 'alone' && (
                <p
                  data-testid="community-room-members-alone"
                  className="font-designer-11m text-text-subtle bg-background-alternative rounded-150 mt-100 p-125"
                >
                  지금은 나 혼자예요. 첫 질문을 남기면 다음 멤버가 대화를 이어갈
                  수 있어요.
                </p>
              )}
              {recentMembers.length > 0 && (
                <div className="bg-fill-success-subtle-default rounded-150 mt-100 flex gap-75 p-125">
                  <HandHeart
                    className="text-text-success size-175 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="font-designer-12m text-text-subtle">
                      최근 정착한 {recentMembers.length}명에게 먼저 환영을 남겨
                      주세요.
                    </p>
                    <div className="mt-75 flex flex-wrap gap-100">
                      {recentMembers.map((member) => (
                        <CommunityAuthorNameTrigger
                          key={member.publicProfileUuid}
                          publicProfileUuid={member.publicProfileUuid}
                          name={member.nickname}
                          image={member.profileImageUrl?.trim() || undefined}
                          imageSize={24}
                          className="font-designer-11b text-text-success"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="border-border-subtle bg-background-default rounded-200 border p-175">
              <h2 className="font-designer-14b text-text-strong">
                이 방, 요즘 어때요
              </h2>
              <dl
                data-testid="community-room-pulse"
                className="mt-125 grid grid-cols-2 gap-100"
              >
                {[
                  [
                    room.activity?.activeMembers7d ?? room.memberCount,
                    '이번 주 다녀간 사람',
                  ],
                  [
                    room.activity?.posts7d ?? room.stats.postCount7d,
                    '최근 7일 새 글',
                  ],
                  [
                    room.activity?.comments7d ?? room.stats.commentCount7d,
                    '최근 7일 댓글',
                  ],
                  [room.newPostsToday, '오늘 새 글'],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="bg-background-alternative rounded-150 p-125"
                  >
                    <dd className="font-designer-20b text-text-strong tabular-nums">
                      {value}
                    </dd>
                    <dt className="font-designer-11b text-text-subtle mt-25">
                      {label}
                    </dt>
                  </div>
                ))}
              </dl>
              <p className="font-designer-11r text-text-subtlest mt-100 leading-relaxed">
                안내용 글은 이 숫자에 들어가지 않아요.
              </p>
            </section>

            <section className="border-border-subtle bg-background-default rounded-200 border p-175">
              <h2 className="font-designer-14b text-text-strong">이 방 규칙</h2>
              <ol className="mt-75">
                {room.rules.map((rule) => (
                  <li
                    key={rule.order}
                    className="border-border-subtlest font-designer-12m text-text-subtle flex gap-100 border-b py-100 last:border-0"
                  >
                    <strong className="text-text-subtlest">{rule.order}</strong>
                    <span>{rule.body}</span>
                  </li>
                ))}
              </ol>
            </section>

            {room.ownership?.claimable && (
              <section className="border-border-brand bg-background-default rounded-200 border border-l-4 p-175">
                <h2 className="font-designer-14b text-text-strong">
                  방장 없음 · 먼저 맡는 사람이 방장이 돼요
                </h2>
                <Button
                  color="primary"
                  size="small"
                  className="mt-125 w-full"
                  disabled={claimOwnershipMutation.isPending}
                  data-testid="community-room-claim-ownership"
                  onClick={handleClaimOwnership}
                >
                  {claimOwnershipMutation.isPending ? '맡는 중' : '내가 맡기'}
                </Button>
              </section>
            )}

            {ownershipMessage && (
              <output
                data-testid="community-room-ownership-result"
                className="border-border-subtle bg-background-default rounded-150 flex gap-75 border p-150"
              >
                <CircleAlert
                  className="text-text-brand size-175 shrink-0"
                  aria-hidden="true"
                />
                <p className="font-designer-12m text-text-subtle">
                  {ownershipMessage}
                </p>
              </output>
            )}

            <LeaveRoomModal
              isPending={leaveMutation.isPending}
              onLeave={() =>
                leaveMutation.mutate(roomId, {
                  onSuccess: () => window.location.assign('/community'),
                  onError: () =>
                    showToast(
                      '방에서 나가지 못했어요. 방 상태를 다시 확인해 주세요.',
                      'error',
                    ),
                })
              }
            />
          </aside>
        )}
      </div>

      {isMember && (
        <section className="border-border-subtle bg-background-default rounded-200 sticky bottom-100 z-10 flex items-center gap-100 border p-100 shadow-2">
          <span
            role="img"
            aria-label="내 프로필"
            className="bg-background-disabled text-text-subtle flex size-400 shrink-0 items-center justify-center rounded-full"
          >
            <User className="size-175" aria-hidden="true" />
          </span>
          <p className="font-designer-13m text-text-subtle min-w-0 flex-1 truncate">
            막힌 지점을 3줄로 올려보세요. 같은 목표인 사람들이 답해요.
          </p>
          <Button asChild color="outlined" size="small">
            <Link href={buildCommunityRoomWriteHref(roomId)}>질문 쓰기</Link>
          </Button>
        </section>
      )}
    </PageContainer>
  );
}
