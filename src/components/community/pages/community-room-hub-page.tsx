'use client';

import {
  Activity,
  ArrowUpRight,
  Flame,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ComponentType, type ReactNode, useMemo, useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { Skeleton } from '@/components/common/ui/loading-skeleton';
import PageContainer from '@/components/common/ui/page-container';
import TextActionButton from '@/components/common/ui/text-action-button';
import ToggleButton from '@/components/common/ui/toggle/button';
import CreateCommunityRoomModal from '@/components/community/modals/create-community-room-modal';
import JoinCommunityRoomModal from '@/components/community/modals/join-community-room-modal';
import { useAuthReady } from '@/features/auth/model/use-auth';
import CommunityAuthorNameTrigger from '@/features/community/ui/community-author-name-trigger';
import { useCommunityRoomHubQuery } from '@/hooks/queries/community/use-community-room-hub-query';
import { useMyRepQuery } from '@/hooks/queries/community/use-community-room-posts-query';
import type {
  CommunityRoomHubFilters,
  CommunityRoomSummary,
} from '@/types/community/room-hub';
import { resolveMyRepUiState } from '@/utils/screen-resilience';

type RoomAxis = keyof CommunityRoomHubFilters;
type BrowseSort = 'activity' | 'popular';
type LoginModalComponent = ComponentType<{
  openTrigger: ReactNode;
  callbackPath?: string;
}>;

type CommunityRoomHubPageProps =
  | { readOnly: true; LoginModalComponent?: never }
  | { readOnly?: false; LoginModalComponent: LoginModalComponent };

const AXIS_LABEL: Record<RoomAxis, string> = {
  job: '직군',
  goal: '목표',
  level: '난이도',
};

const ROOM_ICONS = {
  auto: '/community/rooms/icons/room-auto.jpg',
  deploy: '/community/rooms/icons/room-deploy.jpg',
  portfolio: '/community/rooms/icons/room-portfolio.jpg',
  web: '/community/rooms/icons/room-web.jpg',
} as const;

const sortByActivity = (rooms: CommunityRoomSummary[]) =>
  rooms.slice().sort((left, right) => {
    if (right.newPostsToday !== left.newPostsToday) {
      return right.newPostsToday - left.newPostsToday;
    }

    return right.memberCount - left.memberCount;
  });

const sortByPopularity = (rooms: CommunityRoomSummary[]) =>
  rooms
    .slice()
    .sort(
      (left, right) =>
        right.memberCount - left.memberCount ||
        right.newPostsToday - left.newPostsToday,
    );

const getRoomIcon = (room: CommunityRoomSummary) => {
  const roomText =
    `${room.slug} ${room.code} ${room.name} ${room.description}`.toLowerCase();

  if (/자동|automation|office|excel/.test(roomText)) return ROOM_ICONS.auto;
  if (/배포|deploy|launch|server/.test(roomText)) return ROOM_ICONS.deploy;
  if (/취업|포트폴리오|portfolio|resume/.test(roomText)) {
    return ROOM_ICONS.portfolio;
  }

  return ROOM_ICONS.web;
};

const RoomCard = ({
  isAuthenticated,
  activeRoomCount,
  activeRoomLimit,
  activeRooms,
  isHot,
  isMember,
  onJoined,
  readOnly,
  room,
  LoginModalComponent,
}: {
  isAuthenticated: boolean;
  activeRoomCount: number;
  activeRoomLimit: number;
  activeRooms: CommunityRoomSummary[];
  isHot: boolean;
  isMember: boolean;
  onJoined: (roomId: number) => void;
  readOnly: boolean;
  room: CommunityRoomSummary;
  LoginModalComponent?: LoginModalComponent;
}) => {
  return (
    <article
      data-testid="community-room-card"
      className={cn(
        'border-border-subtle bg-background-default rounded-200 group relative overflow-hidden border shadow-1 transition-[border-color,box-shadow]',
        'hover:border-border-brand hover:shadow-2',
        isHot && 'border-border-warning',
      )}
    >
      <div className="bg-background-disabled relative h-1400">
        <Image
          src={room.bannerUrl || '/community/rooms/room-banner-v2.jpg'}
          alt={`${room.name} 배너`}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          unoptimized={Boolean(room.bannerUrl)}
          className="object-cover"
        />
        <div className="h-full bg-linear-to-t from-black/55 to-transparent" />
        {room.newPostsToday > 0 && (
          <span className="font-designer-10b text-text-inverse absolute top-125 left-125 rounded-full bg-black/70 px-125 py-50">
            오늘 새 글 {room.newPostsToday}
          </span>
        )}
      </div>

      <div className="relative p-175 pt-450">
        <span className="border-border-inverse bg-background-default absolute -top-350 left-175 flex size-700 items-center justify-center overflow-hidden rounded-full border-4 shadow-1">
          <Image
            src={getRoomIcon(room)}
            width={56}
            height={56}
            alt={`${room.name} 아이콘`}
            className="size-full object-cover"
          />
        </span>
        {isHot && (
          <span className="font-designer-11b text-text-warning bg-fill-warning-subtle-default absolute top-100 right-150 inline-flex items-center gap-50 rounded-full px-100 py-50">
            <Flame className="size-150" aria-hidden="true" />
            오늘 뜨는 방
          </span>
        )}

        <div className="flex min-w-0 items-start justify-between gap-100">
          <div className="min-w-0">
            <h3 className="font-designer-18b text-text-strong truncate">
              {room.name}
            </h3>
            <p className="font-designer-12r text-text-subtle mt-75 line-clamp-2 min-h-450 leading-relaxed max-lg:font-designer-16r">
              {room.description ||
                '같은 관심축을 가진 사람들의 질문과 작업 기록을 모아요.'}
            </p>
          </div>
        </div>

        {room.members?.items.length ? (
          // biome-ignore lint/a11y/useAriaPropsSupportedByRole: Preserve the existing web markup while removing only the App-in-Toss regression.
          <div
            aria-label={`${room.name} 방 사람들`}
            className="mt-125 flex items-center gap-75"
          >
            {room.members.items.slice(0, 3).map((member) => (
              <CommunityAuthorNameTrigger
                key={member.publicProfileUuid}
                publicProfileUuid={member.publicProfileUuid}
                name={member.nickname}
                image={member.profileImageUrl ?? undefined}
                imageSize={32}
                className="sr-only"
              />
            ))}
          </div>
        ) : null}

        <div className="border-border-subtlest font-designer-11m text-text-subtle mt-125 flex flex-wrap items-center gap-75 border-t pt-125">
          <span className="inline-flex items-center gap-50">
            <Users className="size-150" aria-hidden="true" />
            멤버 {room.memberCount.toLocaleString()}명
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-50">
            <span
              aria-hidden="true"
              className={cn(
                'bg-fill-neutral-default-default size-75 rounded-full',
                room.liveSignal && 'bg-fill-success-default-default',
              )}
            />
            오늘 글 {room.newPostsToday}개
          </span>
          <span aria-hidden="true">·</span>
          <span>최근 7일 글 {room.stats.postCount7d}개</span>
        </div>

        <div className="border-border-subtlest mt-150 flex items-center justify-between gap-100 border-t pt-150">
          <span className="font-designer-11m text-text-subtlest max-lg:font-designer-16r">
            피드와 아카이브를 둘러보세요
          </span>
          {readOnly ? (
            <span className="font-designer-12m text-text-subtle">
              앱에서는 방 목록만 제공해요
            </span>
          ) : isMember ? (
            <Button asChild color="primary" size="small">
              <Link href={`/community/rooms/${room.roomId}`}>
                들어가기
                <ArrowUpRight className="size-150" aria-hidden="true" />
              </Link>
            </Button>
          ) : isAuthenticated ? (
            <JoinCommunityRoomModal
              room={room}
              activeRoomCount={activeRoomCount}
              activeRoomLimit={activeRoomLimit}
              activeRooms={activeRooms}
              onJoined={() => onJoined(room.roomId)}
              trigger={
                <Button
                  color="primary"
                  size="small"
                  data-testid={`community-room-join-${room.roomId}`}
                >
                  입장하기
                </Button>
              }
            />
          ) : LoginModalComponent ? (
            <LoginModalComponent
              openTrigger={
                <Button
                  color="primary"
                  size="small"
                  data-testid={`community-room-join-${room.roomId}`}
                >
                  입장하기
                </Button>
              }
            />
          ) : null}
        </div>
      </div>
    </article>
  );
};

const MyRoomRow = ({ room }: { room: CommunityRoomSummary }) => (
  <Link
    href={`/community/rooms/${room.roomId}`}
    className="border-border-subtle bg-background-default rounded-200 hover:border-border-brand flex items-center gap-125 border p-150 transition-colors"
  >
    <Image
      src={getRoomIcon(room)}
      width={46}
      height={46}
      alt=""
      className="size-575 shrink-0 rounded-150 object-cover"
    />
    <span className="min-w-0 flex-1">
      <strong className="font-designer-14b text-text-strong block truncate">
        {room.name}
      </strong>
      <span className="font-designer-11m text-text-subtle mt-25 block">
        멤버 {room.memberCount}명 · 오늘 새 글 {room.newPostsToday}개
      </span>
    </span>
    {room.newPostsToday > 0 && (
      <span className="font-designer-10b bg-background-accent-rose-subtle text-text-brand rounded-full px-100 py-50">
        새 글
      </span>
    )}
  </Link>
);

const RankCard = ({
  basis,
  icon,
  rooms,
  subtitle,
  title,
  tone,
  readOnly = false,
}: {
  basis: string;
  icon: React.ReactNode;
  rooms: CommunityRoomSummary[];
  subtitle: string;
  title: string;
  tone: 'activity' | 'popular';
  readOnly?: boolean;
}) => (
  <section
    data-testid={`community-room-ranking-${tone}`}
    className={cn(
      'rounded-200 border p-175',
      tone === 'activity'
        ? 'border-border-warning bg-background-accent-orange-subtle'
        : 'border-border-brand bg-background-accent-rose-subtle',
    )}
  >
    <h2
      className={cn(
        'font-designer-13b flex items-center gap-75 max-lg:font-designer-20b',
        tone === 'activity' ? 'text-text-warning' : 'text-text-brand',
      )}
    >
      {icon}
      {title}
    </h2>
    <span
      className={cn(
        'font-designer-11b mt-50 inline-flex rounded-full px-100 py-25',
        tone === 'activity'
          ? 'bg-fill-warning-subtle-default text-text-warning'
          : 'bg-background-default text-text-brand',
      )}
    >
      뽑는 기준: {basis}
    </span>
    <p className="font-designer-11m text-text-subtle mt-75 max-lg:font-designer-16r">
      {subtitle}
    </p>
    <ol className="mt-75">
      {rooms.slice(0, 3).map((room, index) => (
        <li key={room.roomId}>
          {readOnly ? (
            <div className="border-border-subtlest flex items-center gap-100 border-b py-100 last:border-0 last:pb-0">
              <strong
                className={cn(
                  'font-designer-16b w-225 text-center tabular-nums',
                  index === 0 ? 'text-text-warning' : 'text-text-subtlest',
                )}
              >
                {index + 1}
              </strong>
              <Image
                src={getRoomIcon(room)}
                width={32}
                height={32}
                alt=""
                className="size-400 shrink-0 rounded-full object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="font-designer-13b text-text-strong block truncate max-lg:font-designer-16b">
                  {room.name}
                </span>
                <span className="font-designer-11m text-text-subtle block">
                  {tone === 'activity'
                    ? `오늘 글 ${room.newPostsToday}개 · 최근 7일 ${room.stats.postCount7d}개`
                    : `멤버 ${room.memberCount}명 · 오늘 글 ${room.newPostsToday}개`}
                </span>
              </span>
            </div>
          ) : (
            <Link
              href={`/community/rooms/${room.roomId}`}
              className="border-border-subtlest group flex items-center gap-100 border-b py-100 last:border-0 last:pb-0"
            >
              <strong
                className={cn(
                  'font-designer-16b w-225 text-center tabular-nums',
                  index === 0 ? 'text-text-warning' : 'text-text-subtlest',
                )}
              >
                {index + 1}
              </strong>
              <Image
                src={getRoomIcon(room)}
                width={32}
                height={32}
                alt=""
                className="size-400 shrink-0 rounded-full object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="font-designer-13b text-text-strong group-hover:text-text-brand block truncate max-lg:font-designer-16b">
                  {room.name}
                </span>
                <span className="font-designer-11m text-text-subtle block">
                  {tone === 'activity'
                    ? `오늘 글 ${room.newPostsToday}개 · 최근 7일 ${room.stats.postCount7d}개`
                    : `멤버 ${room.memberCount}명 · 오늘 글 ${room.newPostsToday}개`}
                </span>
              </span>
              <span
                className={cn(
                  'font-designer-11b ml-auto inline-flex shrink-0 items-baseline gap-50 text-right tabular-nums',
                  tone === 'activity' ? 'text-text-warning' : 'text-text-brand',
                )}
              >
                {tone === 'activity' ? '새 글' : '멤버'}
                <strong className="font-designer-14b">
                  {tone === 'activity' ? room.newPostsToday : room.memberCount}
                </strong>
              </span>
            </Link>
          )}
        </li>
      ))}
    </ol>
  </section>
);

const MyRepBalanceBadge = ({
  isAuthenticated,
  LoginModalComponent,
}: {
  isAuthenticated: boolean;
  LoginModalComponent: LoginModalComponent;
}) => {
  const { data, isError, isLoading, refetch } = useMyRepQuery();
  const uiState = resolveMyRepUiState({
    isAuthenticated,
    isLoading,
    isError,
    hasData: Boolean(data),
  });

  if (uiState === 'login') {
    return (
      <LoginModalComponent
        openTrigger={
          <Button color="outlined" size="small" className="max-md:w-full">
            로그인 후 내 평판 확인
          </Button>
        }
      />
    );
  }

  if (uiState === 'loading') {
    return (
      <Skeleton
        aria-label="내 평판을 불러오는 중"
        className="h-400 w-2125 rounded-full"
      />
    );
  }

  if (uiState === 'error') {
    return (
      <Button
        color="outlined"
        size="small"
        className="max-md:w-full"
        onClick={() => refetch()}
      >
        평판 다시 불러오기
      </Button>
    );
  }

  if (uiState === 'empty' || !data) {
    return (
      <div className="border-border-subtle bg-background-default inline-flex items-center rounded-full border px-125 py-75 max-md:w-full max-md:justify-center">
        <span className="font-designer-12m text-text-subtle">
          평판 기록이 아직 없어요
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="community-my-rep"
      className="border-border-brand bg-background-accent-rose-subtle inline-flex items-center gap-75 rounded-full border px-125 py-75 max-md:w-full max-md:justify-center"
    >
      <span className="font-designer-12m text-text-subtle">내 평판</span>
      <strong className="font-designer-13b text-text-brand tabular-nums">
        {data.repBalance.toLocaleString('ko-KR')}점
      </strong>
    </div>
  );
};

export default function CommunityRoomHubPage({
  readOnly = false,
  LoginModalComponent,
}: CommunityRoomHubPageProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<CommunityRoomHubFilters>({});
  const [browseSort, setBrowseSort] = useState<BrowseSort>('activity');
  const { isAuthenticated } = useAuthReady();
  const { data, error, isError, isLoading, refetch } =
    useCommunityRoomHubQuery(filters);

  const exploredRooms = useMemo(() => {
    const rooms = data?.exploreRooms ?? [];
    return browseSort === 'activity'
      ? sortByActivity(rooms)
      : sortByPopularity(rooms);
  }, [browseSort, data?.exploreRooms]);
  const myRooms = useMemo(
    () => sortByActivity(data?.myRooms ?? []),
    [data?.myRooms],
  );
  const activityRanking = useMemo(
    () => sortByActivity(data?.exploreRooms ?? []),
    [data?.exploreRooms],
  );
  const popularityRanking = useMemo(
    () => sortByPopularity(data?.exploreRooms ?? []),
    [data?.exploreRooms],
  );
  const hotRoomIds = useMemo(
    () =>
      new Set(
        activityRanking
          .filter((room) => room.liveSignal)
          .slice(0, 2)
          .map((room) => room.roomId),
      ),
    [activityRanking],
  );

  const toggleAxis = (axis: RoomAxis, code: string) => {
    setFilters((current) => ({
      ...current,
      [axis]: current[axis] === code ? undefined : code,
    }));
  };

  const hasFilters = Object.values(filters).some(Boolean);
  const availableAxes = (['job', 'goal', 'level'] as const).filter(
    (axis) => (data?.axes[axis].length ?? 0) > 0,
  );
  const hasAvailableAxes = availableAxes.length > 0;

  return (
    <div data-testid="community-room-hub">
      <header className="bg-background-neutral-strong relative min-h-0 overflow-hidden md:px-300 xl:min-h-3750 max-lg:bg-background-default max-lg:py-400 max-md:px-200 max-md:py-300 lg:min-h-3400 lg:px-0">
        <picture>
          <source
            media="(max-width: 1023px)"
            srcSet="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
          />
          <Image
            src="/community/rooms/home-hero-v3.jpg"
            alt=""
            fill
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            className="object-cover opacity-50 max-lg:hidden"
          />
        </picture>
        <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/65 to-black/20 max-lg:hidden" />
        <div className="relative mx-auto flex min-h-0 w-full max-w-page flex-col justify-start px-0 pb-0 xl:min-h-3750 xl:px-home-hero-desktop-inset xl:pb-425 lg:min-h-3400 lg:justify-end lg:pb-325">
          <span className="font-designer-11b text-text-brand w-fit rounded-full bg-white/10 px-125 py-50 backdrop-blur-sm max-lg:rounded-none max-lg:bg-transparent max-lg:px-0 max-lg:py-0 max-lg:font-designer-12b max-lg:tracking-wide max-lg:backdrop-blur-none">
            ZERO·ONE COMMUNITY
          </span>
          <h1
            data-testid="mobile-community-heading"
            className="font-designer-30b text-text-inverse mt-100 md:font-designer-34b xl:font-designer-40b max-lg:text-text-strong max-lg:break-keep max-md:font-designer-28b"
          >
            당신의 0을,<span className="lg:hidden"> </span>
            <br className="max-lg:hidden" />
            우리의 1로
          </h1>
          <p className="font-designer-14r mt-75 max-w-2xl text-white/75 max-lg:font-designer-16r max-lg:text-text-default max-lg:break-keep">
            당신이 만드는 이야기가 우리의 소중한 노하우가 됩니다
          </p>
          {!readOnly ? (
            <div className="mt-175 flex flex-wrap items-center gap-100 max-md:grid max-md:grid-cols-2">
              {isAuthenticated && data ? (
                <CreateCommunityRoomModal
                  activeRoomCount={data.activeRoomCount}
                  activeRoomLimit={data.activeRoomLimit}
                  axes={data.axes}
                  onCreated={(roomId) =>
                    router.push(`/community/rooms/${roomId}`)
                  }
                  triggerClassName="max-md:w-full"
                />
              ) : LoginModalComponent ? (
                <LoginModalComponent
                  openTrigger={
                    <Button
                      color="primary"
                      size="medium"
                      icon={<PlusCircle />}
                      className="max-md:w-full"
                    >
                      방 만들기
                    </Button>
                  }
                />
              ) : null}
              {isAuthenticated && data && (
                <span
                  data-testid="community-room-active-counter"
                  className="font-designer-12b rounded-full bg-black/45 px-125 py-75 text-white/85 backdrop-blur-sm"
                >
                  입장한 방 {data.activeRoomCount}/{data.activeRoomLimit}
                </span>
              )}
              {LoginModalComponent ? (
                <MyRepBalanceBadge
                  isAuthenticated={isAuthenticated}
                  LoginModalComponent={LoginModalComponent}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <PageContainer className="flex flex-col gap-250 md:px-300 lg:px-400 xl:gap-300">
        <section
          data-testid="community-room-filter-panel"
          className="border-border-subtle bg-background-default rounded-200 border p-175 sm:p-200"
        >
          <div className="mb-125 flex items-center justify-between gap-100">
            <h2 className="font-designer-14b text-text-strong">방 고르기</h2>
            <TextActionButton
              type="button"
              disabled={!hasFilters}
              tone="subtle"
              weight="bold"
              className="font-designer-12b text-text-default disabled:text-text-disabled border-0 p-0 underline underline-offset-4 max-lg:font-designer-16m"
              onClick={() => setFilters({})}
            >
              조건 지우기
            </TextActionButton>
          </div>
          {hasAvailableAxes ? (
            <div className="flex flex-col gap-125">
              {availableAxes.map((axis) => (
                <div
                  key={axis}
                  className="flex flex-wrap items-center gap-75 max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-25"
                >
                  <span className="font-designer-12b text-text-subtle w-400 max-md:w-500 max-md:shrink-0 max-md:whitespace-nowrap max-lg:font-designer-16m">
                    {AXIS_LABEL[axis]}
                  </span>
                  {data?.axes[axis].map((tag) => {
                    const isSelected = filters[axis] === tag.code;

                    return (
                      <ToggleButton
                        key={tag.code}
                        data-testid={`community-room-filter-${axis}-${tag.code}`}
                        pressed={isSelected}
                        onPressedChange={() => toggleAxis(axis, tag.code)}
                        color="primary"
                        size="sm"
                        variant="round"
                        className={cn(
                          'font-designer-12m px-125 py-75 max-md:shrink-0 max-lg:min-h-550 max-lg:font-designer-16m',
                          isSelected
                            ? 'data-[state=on]:border-border-brand data-[state=on]:bg-fill-brand-default-default data-[state=on]:text-text-inverse'
                            : 'data-[state=off]:border-border-subtle data-[state=off]:bg-background-default data-[state=off]:text-text-subtle hover:bg-fill-neutral-default-hover',
                        )}
                      >
                        {tag.label}
                      </ToggleButton>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : data ? (
            <p
              data-testid="community-room-filter-empty"
              className="font-designer-14r text-text-subtle break-keep"
            >
              지금은 고를 수 있는 조건이 없어요. 아래 열린 방을 먼저 둘러보세요.
            </p>
          ) : null}
          <p className="border-border-subtlest font-designer-12m text-text-subtle mt-125 border-t pt-125 max-lg:font-designer-16r">
            {hasFilters ? '고른 조건에 맞는 방 ' : '둘러볼 수 있는 방 '}
            <strong className="text-text-brand">
              {exploredRooms.length}개
            </strong>
            가 아래에 있어요. 조건은 방을 찾는 데만 씁니다. 방을 만들 때는 묻지
            않습니다.
          </p>
        </section>

        {isLoading && (
          <section
            aria-label="방 목록을 불러오는 중"
            className="grid gap-150 lg:grid-cols-2"
          >
            {['first', 'second', 'third', 'fourth'].map((key) => (
              <div
                key={key}
                className="bg-background-disabled rounded-200 h-300 animate-pulse"
              />
            ))}
          </section>
        )}

        {isError && (
          <section
            data-testid="community-room-error"
            className="border-border-subtle bg-background-default rounded-200 flex flex-col items-center gap-150 border p-400 text-center"
          >
            <div data-testid="route-error" className="contents" />
            <h2 className="font-designer-20b text-text-strong">
              방 목록을 불러오지 못했어요
            </h2>
            <p className="font-designer-14r text-text-subtle">
              {error instanceof Error
                ? error.message
                : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'}
            </p>
            <Button
              color="outlined"
              size="medium"
              icon={<RefreshCw />}
              onClick={() => refetch()}
            >
              다시 시도
            </Button>
          </section>
        )}

        {!isLoading && !isError && data && (
          <>
            {exploredRooms.length > 0 && (
              <section className="grid gap-125 md:grid-cols-2">
                <RankCard
                  icon={<Flame className="size-150" aria-hidden="true" />}
                  rooms={activityRanking}
                  basis="오늘 0시 이후 새 글 수"
                  subtitle="오늘 자정 이후 글이 실제로 오간 방부터 보여드려요."
                  title="지금 활발한 방 TOP"
                  tone="activity"
                  readOnly={readOnly}
                />
                <RankCard
                  icon={<TrendingUp className="size-150" aria-hidden="true" />}
                  rooms={popularityRanking}
                  basis="정착한 멤버 수"
                  subtitle="사람이 많이 모여 답이 빨리 붙는 순서예요."
                  title="멤버가 모인 인기 방"
                  tone="popular"
                  readOnly={readOnly}
                />
              </section>
            )}

            {myRooms.length === 0 && exploredRooms.length > 0 && (
              <section className="border-border-brand bg-background-default rounded-150 border border-l-4 p-175">
                <h2 className="font-designer-14b text-text-strong">
                  아직 소속된 방이 없어요
                </h2>
                <p className="font-designer-12r text-text-subtle mt-50 max-lg:font-designer-16r">
                  목표가 가장 가까운 방 하나를 먼저 골라보세요. 읽기만 해도
                  괜찮아요.
                </p>
              </section>
            )}

            {myRooms.length >= data.activeRoomLimit && (
              <section className="border-border-brand bg-background-default rounded-150 border border-l-4 p-175">
                <h2 className="font-designer-14b text-text-strong">
                  방 {data.activeRoomLimit}개에 모두 정착했어요
                </h2>
                <p className="font-designer-12r text-text-subtle mt-50 max-lg:font-designer-16r">
                  더 들어가려면 한 곳을 바꿔야 해요. 나와도 내가 쓴 글은 그대로
                  남습니다.
                </p>
              </section>
            )}

            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-250">
              <aside className="flex flex-col gap-150 xl:order-2 xl:sticky xl:top-1000">
                {myRooms.length > 0 && (
                  <section className="flex flex-col gap-125">
                    <div>
                      <h2 className="font-designer-15b text-text-strong">
                        내 방{' '}
                        <span className="text-text-brand tabular-nums">
                          {myRooms.length}
                        </span>
                      </h2>
                    </div>
                    <div className="grid gap-100 md:grid-cols-2 xl:grid-cols-1">
                      {myRooms.map((room) => (
                        <MyRoomRow key={room.roomId} room={room} />
                      ))}
                    </div>
                    <p className="font-designer-11m text-text-subtlest">
                      방은 한 번에 {data.activeRoomLimit}개까지 정착할 수
                      있어요.
                    </p>
                  </section>
                )}

                <section className="border-border-subtle bg-background-default rounded-200 border p-175">
                  <h2 className="font-designer-14b text-text-strong">
                    방 고르는 법
                  </h2>
                  <p className="font-designer-12r text-text-subtle mt-75 leading-relaxed max-lg:font-designer-16r">
                    내 직군보다{' '}
                    <strong className="text-text-strong">목표</strong>가 같은
                    방이 좋습니다. 첫 매출, 자동화, 배포처럼 지금 해결할 문제를
                    기준으로 고르세요.
                  </p>
                </section>

                <section className="border-border-brand bg-background-accent-rose-subtle rounded-200 border p-175">
                  <h2 className="font-designer-14b text-text-brand">
                    내 목표에 맞는 방이 없나요?
                  </h2>
                  <p className="font-designer-12r text-text-subtle mt-75 max-lg:font-designer-16r">
                    배너, 소개, 첫 글을 채우면 빈 방 없이 바로 시작할 수 있어요.
                  </p>
                  {!readOnly && isAuthenticated && data && (
                    <div className="mt-125">
                      <CreateCommunityRoomModal
                        activeRoomCount={data.activeRoomCount}
                        activeRoomLimit={data.activeRoomLimit}
                        axes={data.axes}
                        onCreated={(roomId) =>
                          router.push(`/community/rooms/${roomId}`)
                        }
                      />
                    </div>
                  )}
                </section>
              </aside>

              {/* xl 미만에서는 위 래퍼가 grid 가 아니라 일반 블록이라
                  xl:gap-250 이 적용되지 않는다. 그래서 aside 의 마지막 카드와
                  "아직 정착하지 않은 방" 제목이 붙어버렸다(2026-08-19 라이브 관측).
                  스택 배치일 때만 위 여백을 준다. */}
              <main className="mt-300 flex min-w-0 flex-col gap-300 xl:order-1 xl:mt-0">
                {exploredRooms.length > 0 ? (
                  <section className="flex flex-col gap-125">
                    <div className="flex flex-wrap items-end justify-between gap-100">
                      <div>
                        <p className="font-designer-12b text-text-subtlest">
                          아직 정착하지 않은 방
                        </p>
                        <h2 className="font-designer-20b text-text-strong mt-25">
                          {readOnly
                            ? '목표가 같은 방을 둘러보세요'
                            : '목표가 같은 방을 골라 입장하세요'}
                        </h2>
                      </div>
                      <fieldset className="border-border-subtle bg-background-default flex rounded-full border p-25">
                        <legend className="sr-only">방 정렬</legend>
                        {(
                          [
                            ['activity', '활발한 순', Activity],
                            ['popular', '인기 순', Users],
                          ] as const
                        ).map(([value, label, Icon]) => (
                          <ToggleButton
                            key={value}
                            pressed={browseSort === value}
                            onPressedChange={() => setBrowseSort(value)}
                            color="gray"
                            size="sm"
                            variant="round"
                            className={cn(
                              'font-designer-12b gap-50 border-0 px-125 py-75 max-lg:min-h-550 max-lg:font-designer-16m',
                              browseSort === value
                                ? 'data-[state=on]:border-0 data-[state=on]:bg-fill-neutral-default-default data-[state=on]:text-text-strong'
                                : 'data-[state=off]:border-0 data-[state=off]:bg-transparent data-[state=off]:text-text-default',
                            )}
                          >
                            <Icon className="size-150" aria-hidden="true" />
                            {label}
                          </ToggleButton>
                        ))}
                      </fieldset>
                    </div>
                    <div className="grid gap-125 md:grid-cols-2">
                      {exploredRooms.map((room) => (
                        <RoomCard
                          key={room.roomId}
                          isAuthenticated={isAuthenticated}
                          activeRoomCount={data.activeRoomCount}
                          activeRoomLimit={data.activeRoomLimit}
                          activeRooms={myRooms}
                          isHot={hotRoomIds.has(room.roomId)}
                          isMember={false}
                          onJoined={(roomId) =>
                            router.push(`/community/rooms/${roomId}`)
                          }
                          readOnly={readOnly}
                          room={room}
                          LoginModalComponent={LoginModalComponent}
                        />
                      ))}
                    </div>
                  </section>
                ) : (
                  <section
                    data-testid="community-room-empty"
                    className="border-border-default bg-background-default rounded-200 flex flex-col items-center gap-150 border border-dashed p-400 text-center"
                  >
                    <h2 className="font-designer-20b text-text-strong">
                      방을 준비하고 있어요
                    </h2>
                    <p className="font-designer-14r text-text-subtle">
                      같은 목표끼리 모이는 방이 열리면 가장 먼저 알려드릴게요.
                    </p>
                    <Button asChild color="outlined" size="medium">
                      <Link href="/insights">인사이트 먼저 둘러보기</Link>
                    </Button>
                  </section>
                )}
              </main>
            </div>
          </>
        )}
      </PageContainer>
    </div>
  );
}
