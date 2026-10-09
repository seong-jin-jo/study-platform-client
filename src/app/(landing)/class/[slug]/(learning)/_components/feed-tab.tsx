'use client';

import { ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useReducer } from 'react';
import { PlanSelectionModal } from '@/components/class/plan-selection-modal';
import Button from '@/components/common/ui/button';
import { Menu, shouldUseMenuMobileSheet } from '@/components/common/ui/menu';
import ToggleButton from '@/components/common/ui/toggle/button';
import { useAuth } from '@/features/auth/model/use-auth';
import {
  useGetBuilderFeeds,
  useGetCourseCurriculum,
  useGetCourseDetail,
} from '@/hooks/queries/course/course-queries';
import type { BuilderFeedPaywall } from '@/types/api/course.types';
import { FeedListCard } from '../feed/_components/feed-list-card';
import { PaginationBar } from '../feed/_components/pagination-bar';
import { PaywallSection } from '../feed/_components/paywall-section';
import { getFeedLessonMenuOptions } from './feed-menu-options';

const LoginModal = dynamic(
  () => import('@/components/auth/modals/login-modal'),
);

type SortOption = '최신순' | '인기순';
type FeedFilter = '전체' | '운영자 PICK' | '내 피드';

const SORT_OPTIONS: SortOption[] = ['최신순', '인기순'];

const SORT_API_MAP: Record<SortOption, 'LATEST' | 'POPULAR'> = {
  최신순: 'LATEST',
  인기순: 'POPULAR',
};

const FILTER_API_MAP: Record<FeedFilter, 'ALL' | 'OPERATOR_PICK' | 'MY'> = {
  전체: 'ALL',
  '운영자 PICK': 'OPERATOR_PICK',
  '내 피드': 'MY',
};

const PAGE_SIZE = 10;

interface FeedTabState {
  filter: FeedFilter;
  sort: SortOption;
  lessonId: number | null;
  currentPage: number;
  showPlanModal: boolean;
}

type FeedTabAction =
  | { type: 'changeFilter'; filter: FeedFilter }
  | { type: 'changeLesson'; lessonId: number | null }
  | { type: 'changeSort'; sort: SortOption }
  | { type: 'setPage'; page: number }
  | { type: 'setPlanModal'; open: boolean };

const INITIAL_FEED_TAB: FeedTabState = {
  filter: '전체',
  sort: '최신순',
  lessonId: null,
  currentPage: 0,
  showPlanModal: false,
};

function feedTabReducer(
  state: FeedTabState,
  action: FeedTabAction,
): FeedTabState {
  switch (action.type) {
    case 'changeFilter':
      return { ...state, filter: action.filter, currentPage: 0 };
    case 'changeLesson':
      return {
        ...state,
        lessonId: action.lessonId,
        currentPage: 0,
      };
    case 'changeSort':
      return {
        ...state,
        sort: action.sort,
        currentPage: 0,
      };
    case 'setPage':
      return { ...state, currentPage: action.page };
    case 'setPlanModal':
      return { ...state, showPlanModal: action.open };
    default:
      return state;
  }
}

export function FeedTab() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [state, dispatch] = useReducer(feedTabReducer, INITIAL_FEED_TAB);
  const { filter, sort, lessonId, currentPage } = state;

  const { data: course } = useGetCourseDetail(slug);
  const courseId = course?.courseId ?? 0;
  const { data: curriculum } = useGetCourseCurriculum(slug);

  const { data: operatorPickProbe } = useGetBuilderFeeds({
    courseId,
    filter: 'OPERATOR_PICK',
    size: 1,
  });
  const hasOperatorPick = (operatorPickProbe?.totalCount ?? 0) > 0;

  // 운영자 PICK 옵션이 사라지면 선택값을 effect로 되돌리지 않고 렌더 시 '전체'로 파생.
  const effectiveFilter: FeedFilter =
    !hasOperatorPick && filter === '운영자 PICK' ? '전체' : filter;

  const { data: feedData, isLoading } = useGetBuilderFeeds({
    courseId,
    sort: SORT_API_MAP[sort],
    filter: FILTER_API_MAP[effectiveFilter],
    lessonId: lessonId ?? undefined,
    page: currentPage,
    size: PAGE_SIZE,
  });

  const filterOptions: FeedFilter[] = [
    '전체',
    ...(hasOperatorPick ? (['운영자 PICK'] as FeedFilter[]) : []),
    '내 피드',
  ];

  const lessonOptions = useMemo(
    () =>
      getFeedLessonMenuOptions(
        curriculum?.chapters.flatMap((ch) =>
          ch.lessons.map((l) => ({
            lessonId: l.lessonId,
            label: `Lesson ${String(l.order).padStart(2, '0')}`,
          })),
        ) ?? [],
      ),
    [curriculum],
  );

  const lessonLabel =
    lessonOptions.find((l) => l.lessonId === lessonId)?.label ?? '전체';

  const feeds = feedData?.feeds ?? [];
  const totalCount = feedData?.totalCount ?? 0;
  const totalCountLabel =
    feedData?.feedCountLabel ??
    `지금까지 ${totalCount}개의 피드가 완성되었어요!`;
  const weeklyTopBuilder = feedData?.weeklyTopBuilder;
  // TODO: restore paywall when access control is re-enabled
  // const paywall = feedData?.paywall ?? null;
  const paywall: BuilderFeedPaywall | null = null;

  const emptyMessage =
    effectiveFilter === '내 피드'
      ? '아직 작성한 피드가 없어요. 첫 피드를 올려보세요!'
      : effectiveFilter === '운영자 PICK'
        ? '운영자가 선택한 피드가 아직 없어요.'
        : lessonId !== null
          ? '해당 레슨의 피드가 아직 없어요.'
          : '아직 등록된 피드가 없어요.';

  const handleFilterChange = (f: FeedFilter) =>
    dispatch({ type: 'changeFilter', filter: f });

  const handleLessonChange = (id: number | null) =>
    dispatch({ type: 'changeLesson', lessonId: id });

  const handleSortChange = (s: SortOption) =>
    dispatch({ type: 'changeSort', sort: s });

  return (
    <div className="w-full pb-800">
      <div className="mx-auto w-full max-w-1496 px-400 pt-500 md:px-3000 md:pt-750">
        {/* Header */}
        <div className="mb-400">
          <p className="font-designer-24b text-gray-1000">{totalCountLabel}</p>
          {weeklyTopBuilder && (
            <p className="mt-125 min-w-0 font-designer-16r text-gray-800">
              이번 주 최다 좋아요 빌더 :{' '}
              <span
                title={weeklyTopBuilder.nickname}
                className="inline-block max-w-1500 min-w-0 truncate align-bottom md:max-w-[180px]"
              >
                {weeklyTopBuilder.nickname}
              </span>{' '}
              님 👋
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="mb-400 flex flex-col gap-200 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter chips */}
          <div className="flex gap-225">
            {filterOptions.map((f) => (
              <ToggleButton
                key={f}
                size="md"
                pressed={effectiveFilter === f}
                onPressedChange={() => handleFilterChange(f)}
                className="shrink-0 whitespace-nowrap px-250 py-100 font-designer-14m transition-colors data-[state=off]:border-gray-450 data-[state=off]:bg-transparent data-[state=off]:text-gray-450 data-[state=off]:active:bg-gray-100 data-[state=on]:border-background-brand-default data-[state=on]:bg-transparent data-[state=on]:text-background-brand-default"
              >
                {f}
              </ToggleButton>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-225">
            {/* Sort dropdown */}
            <Menu.Root>
              <Menu.Trigger>
                <Button
                  color="outlined"
                  icon={<ChevronDown aria-hidden="true" />}
                  iconPosition="right"
                  size="large"
                  type="button"
                  className="shrink-0 whitespace-nowrap md:h-400 md:rounded-75 md:px-100 md:font-designer-14b"
                >
                  {sort}
                </Button>
              </Menu.Trigger>
              <Menu.Content>
                <Menu.RadioGroup value={sort} onValueChange={handleSortChange}>
                  {SORT_OPTIONS.map((option) => (
                    <Menu.RadioItem key={option} value={option}>
                      {option}
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Content>
            </Menu.Root>

            {/* Lesson filter dropdown */}
            <Menu.Root>
              <Menu.Trigger disabled={lessonOptions.length === 1}>
                <Button
                  color="outlined"
                  disabled={lessonOptions.length === 1}
                  icon={<ChevronDown aria-hidden="true" />}
                  iconPosition="right"
                  size="large"
                  title={
                    lessonOptions.length === 1
                      ? '등록된 레슨이 아직 없어요'
                      : undefined
                  }
                  type="button"
                  className="shrink-0 whitespace-nowrap md:h-400 md:rounded-75 md:px-100 md:font-designer-14b"
                >
                  {lessonLabel}
                </Button>
              </Menu.Trigger>
              <Menu.Content
                mobileSheet={shouldUseMenuMobileSheet(lessonOptions)}
              >
                <Menu.RadioGroup
                  value={lessonId === null ? 'all' : String(lessonId)}
                  onValueChange={(value) =>
                    handleLessonChange(value === 'all' ? null : Number(value))
                  }
                >
                  {lessonOptions.map((option) => (
                    <Menu.RadioItem
                      key={option.lessonId ?? 'all'}
                      value={
                        option.lessonId === null
                          ? 'all'
                          : String(option.lessonId)
                      }
                    >
                      {option.label}
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Content>
            </Menu.Root>

            {/* Write CTA */}
            {isAuthenticated ? (
              <Link
                href={`/class/${slug}/feed/write`}
                className="ml-auto shrink-0 whitespace-nowrap rounded-100 bg-background-brand-default px-250 py-125 font-designer-16m text-text-inverse"
              >
                피드 올리기
              </Link>
            ) : (
              <LoginModal
                openTrigger={
                  <Button
                    type="button"
                    color="primary"
                    size="large"
                    className="ml-auto h-auto shrink-0 whitespace-nowrap px-250 py-125 font-designer-16m hover:bg-fill-brand-default-default active:bg-fill-brand-default-default"
                  >
                    피드 올리기
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* Feed list */}
        {isLoading ? (
          <div className="flex justify-center py-800">
            <p className="font-designer-16r text-gray-500">로딩 중...</p>
          </div>
        ) : feeds.length === 0 ? (
          <div className="flex justify-center py-800">
            <p className="font-designer-16r text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-300 sm:grid-cols-2 xl:grid-cols-3">
            {feeds.map((feed) => (
              <FeedListCard key={feed.feedId} feed={feed} slug={slug} />
            ))}
          </div>
        )}

        {paywall ? (
          <PaywallSection
            paywall={paywall}
            onCtaClick={() => dispatch({ type: 'setPlanModal', open: true })}
          />
        ) : (
          <PaginationBar
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={(page) => dispatch({ type: 'setPage', page })}
          />
        )}
      </div>
      {state.showPlanModal && course?.plans?.[0] && (
        <PlanSelectionModal
          plan={course.plans[0]}
          earlyBirdEndsAt={course?.earlyBirdEndsAt ?? null}
          onClose={() => dispatch({ type: 'setPlanModal', open: false })}
          slug={slug}
        />
      )}
    </div>
  );
}
