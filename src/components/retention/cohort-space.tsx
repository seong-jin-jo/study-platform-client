'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LoaderCircle,
  MessageCircle,
  PenLine,
  Pin,
  RefreshCw,
  Sprout,
  ThumbsUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import Button from '@/components/common/ui/button';
import ToggleButton from '@/components/common/ui/toggle/button';
import { RetentionPage } from '@/components/retention/retention-shell';
import {
  createCommunityIdempotencyKey,
  createCommunityPost,
  getCommunityErrorMessage,
  getCommunityFeed,
} from '@/features/community/api/community-api';
import { useMyCohortsQuery } from '@/hooks/queries/retention/use-retention-queries';
import { useToastStore } from '@/stores/use-toast-store';
import {
  COMMUNITY_BOARD,
  isCommunityBoard,
  type CommunityBoard,
} from '@/types/community/domain';

const COHORT_FEED_SIZE = 20;

const FEED_FILTERS: Array<{ board: CommunityBoard; label: string }> = [
  { board: COMMUNITY_BOARD.FREE, label: '이야기' },
  { board: COMMUNITY_BOARD.ACHIEVEMENT, label: '만든 것' },
  { board: COMMUNITY_BOARD.KNOWLEDGE, label: '자료' },
];

const toContentHtml = (content: string) =>
  content
    .trim()
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${paragraph
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')}</p>`,
    )
    .join('');

const getRoomDescription = (roomName: string, goalLabel?: string | null) => {
  if (goalLabel) {
    return (
      <>
        <b>{goalLabel}</b>을 목표로, 오늘 만든 것과 막힌 지점을 함께 나누는
        방이에요.
      </>
    );
  }

  return <>{roomName}에서 오늘 만든 것과 막힌 지점을 함께 나눠요.</>;
};

export default function CohortSpace({ cohortId }: { cohortId: number }) {
  const [selectedBoard, setSelectedBoard] = useState<CommunityBoard>(
    COMMUNITY_BOARD.FREE,
  );
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const { data, isLoading, isError, refetch } = useMyCohortsQuery();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const room = data?.find((item) => item.id === cohortId);
  const feedQuery = useQuery({
    queryKey: ['community', 'cohort-feed', cohortId, selectedBoard],
    queryFn: () =>
      getCommunityFeed({
        board: selectedBoard,
        page: 1,
        size: COHORT_FEED_SIZE,
        cohortId,
      }),
    enabled: Boolean(room),
  });
  const createPostMutation = useMutation({
    mutationFn: ({
      board,
      title,
      content,
    }: {
      board: CommunityBoard;
      title: string;
      content: string;
    }) =>
      createCommunityPost(
        {
          board,
          title,
          contentHtml: toContentHtml(content),
          cohortId,
        },
        createCommunityIdempotencyKey(`cohort-${cohortId}`),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['community', 'cohort-feed', cohortId],
      });
      showToast('방에 글을 남겼어요.', 'success');
    },
    onError: (error) => {
      showToast(
        getCommunityErrorMessage(
          error,
          '글을 남기지 못했어요. 잠시 후 다시 시도해주세요.',
        ),
        'error',
      );
    },
  });

  const focusComposer = () => composerRef.current?.focus();

  if (isLoading) {
    return (
      <RetentionPage>
        <div className="flex items-center gap-100 rounded-200 border border-gray-200 bg-white p-250 text-[14px] font-semibold text-gray-600">
          <LoaderCircle className="size-200 animate-spin" aria-hidden />방
          정보를 불러오는 중이에요.
        </div>
      </RetentionPage>
    );
  }

  if (isError) {
    return (
      <RetentionPage>
        <StateCard
          title="방 정보를 불러오지 못했어요"
          description="잠시 후 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => refetch()}
        />
      </RetentionPage>
    );
  }

  if (!room) {
    return (
      <RetentionPage>
        <StateCard
          title="아직 배정된 방이 없어요"
          description="방 배정 후에 같은 목표의 사람들과 글을 나눌 수 있어요. 내 방 목록에서 다시 선택해주세요."
        />
      </RetentionPage>
    );
  }

  const roomTitle = room.goalLabel ?? room.name;
  const roomBadge = room.type === 'SEMINAR' ? '내 기수' : '같은 목표';
  const isEmpty =
    !feedQuery.isLoading &&
    !feedQuery.isError &&
    feedQuery.data?.items.length === 0;

  return (
    <RetentionPage>
      <div className="overflow-hidden rounded-250 border border-gray-200 bg-gray-50 lg:rounded-300">
        <nav
          aria-label="내 방"
          className="border-b border-gray-100 bg-white px-175 py-125 lg:px-350 lg:py-200"
        >
          <p className="mb-75 font-designer-12b font-extrabold tracking-[0.04em] text-gray-400">
            내 방 · 눌러서 이동
          </p>
          <div className="flex gap-75 overflow-x-auto pb-25">
            {data?.map((cohort) => {
              const isCurrent = cohort.id === cohortId;
              return (
                <Link
                  key={cohort.id}
                  href={`/cohorts/${cohort.id}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={
                    isCurrent
                      ? 'flex h-400 shrink-0 items-center rounded-full border border-gray-900 bg-gray-900 px-175 font-designer-13b font-extrabold text-white'
                      : 'flex h-400 shrink-0 items-center rounded-full border border-gray-200 bg-white px-175 font-designer-13b font-extrabold text-gray-600 transition-colors hover:bg-gray-50'
                  }
                >
                  {cohort.goalLabel ?? cohort.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_4050px] lg:gap-325 lg:p-350">
          <aside className="border-b border-gray-100 bg-white px-225 py-200 lg:order-2 lg:sticky lg:top-300 lg:self-start lg:rounded-200 lg:border lg:border-gray-200">
            <div className="flex items-center gap-100">
              <h1 className="text-[20px] font-black tracking-[-0.6px] text-gray-900">
                {roomTitle}
              </h1>
              <span
                className={
                  room.type === 'SEMINAR'
                    ? 'rounded-full bg-rose-50 px-100 py-50 font-designer-12b font-extrabold text-rose-700'
                    : 'rounded-full bg-blue-50 px-100 py-50 font-designer-12b font-extrabold text-blue-700'
                }
              >
                {roomBadge}
              </span>
            </div>
            <p className="mt-75 font-designer-13r leading-[1.55] text-gray-600">
              {getRoomDescription(room.name, room.goalLabel)}
            </p>
            <div className="mt-150 flex items-center gap-75 font-designer-12b font-bold text-gray-600">
              <span className="size-75 rounded-full bg-green-600 ring-4 ring-green-50" />
              <Users className="size-175 text-gray-500" aria-hidden />
              같은 방 사람들의 글을 보고 있어요
            </div>
            <div className="mt-175 hidden border-t border-gray-100 pt-175 lg:block">
              <p className="font-designer-12b font-extrabold tracking-[0.04em] text-gray-400">
                이 방의 약속
              </p>
              <div className="mt-100 flex flex-wrap gap-75">
                {[
                  '막힌 화면을 구체적으로',
                  '작업물·에러는 가리고',
                  '조롱 없이 다음 행동',
                ].map((rule) => (
                  <span
                    key={rule}
                    className="rounded-full border border-gray-200 bg-gray-50 px-125 py-62 font-designer-12b font-bold text-gray-600"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <main className="min-w-0 px-175 py-175 lg:order-1 lg:px-0 lg:py-0">
            <div className="flex gap-75 overflow-x-auto border-b border-gray-100 pb-125">
              {FEED_FILTERS.map((filter) => {
                const isSelected = selectedBoard === filter.board;
                return (
                  <ToggleButton
                    key={filter.board}
                    pressed={isSelected}
                    onPressedChange={() => setSelectedBoard(filter.board)}
                    color="gray"
                    size="sm"
                    variant="round"
                    className={
                      isSelected
                        ? 'h-375 shrink-0 border-0 px-175 py-0 font-designer-13b font-extrabold data-[state=on]:border-0 data-[state=on]:bg-gray-900 data-[state=on]:text-white'
                        : 'h-375 shrink-0 border-0 px-175 py-0 font-designer-13b font-extrabold data-[state=off]:border-0 data-[state=off]:bg-gray-100 data-[state=off]:text-gray-600 hover:bg-gray-200'
                    }
                  >
                    {filter.label}
                  </ToggleButton>
                );
              })}
            </div>

            <PinnedWelcome onWrite={focusComposer} />

            <form
              className="mt-150 rounded-200 border border-gray-200 bg-white p-175"
              onSubmit={(event) => {
                event.preventDefault();
                const formElement = event.currentTarget;
                const form = new FormData(formElement);
                const title = String(form.get('title') ?? '').trim();
                const content = String(form.get('content') ?? '').trim();
                const board = String(form.get('board') ?? COMMUNITY_BOARD.FREE);

                if (title.length < 2 || !content) {
                  showToast(
                    '제목은 두 글자 이상, 내용은 비우지 말고 적어주세요.',
                    'error',
                  );
                  return;
                }

                if (
                  !isCommunityBoard(board) ||
                  !FEED_FILTERS.some((filter) => filter.board === board)
                ) {
                  showToast('글 종류를 다시 선택해주세요.', 'error');
                  return;
                }

                createPostMutation.mutate(
                  { title, content, board },
                  { onSuccess: () => formElement.reset() },
                );
              }}
            >
              <div className="flex items-center justify-between gap-100">
                <p className="font-designer-13b font-extrabold text-gray-800">
                  자기소개나 지금 막힌 질문을 남겨보세요
                </p>
                <select
                  name="board"
                  defaultValue={COMMUNITY_BOARD.FREE}
                  aria-label="글 종류"
                  className="h-400 rounded-125 border border-gray-200 bg-white px-100 font-designer-13b font-bold text-gray-700 outline-none focus:border-rose-500"
                >
                  {FEED_FILTERS.map((filter) => (
                    <option key={filter.board} value={filter.board}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="mt-125 block">
                <span className="sr-only">글 제목</span>
                <input
                  name="title"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="무엇을 만들고 어디서 막혔나요?"
                  className="h-500 w-full rounded-125 border border-gray-200 px-150 text-[14px] outline-none placeholder:text-gray-400 focus:border-rose-500"
                />
              </label>
              <label className="mt-100 block">
                <span className="sr-only">글 내용</span>
                <textarea
                  ref={composerRef}
                  name="content"
                  required
                  rows={4}
                  placeholder="무엇을 만드는지 · 어디서 막혔는지 · 원하는 답을 세 줄로 적어주세요."
                  className="w-full resize-y rounded-125 border border-gray-200 px-150 py-125 text-[16px] leading-[1.6] outline-none placeholder:text-gray-400 focus:border-rose-500 lg:text-[14px]"
                />
              </label>
              <div className="mt-125 flex justify-end">
                <Button
                  type="submit"
                  color="primary"
                  size="large"
                  aria-busy={createPostMutation.isPending}
                  disabled={createPostMutation.isPending}
                  icon={
                    createPostMutation.isPending ? (
                      <LoaderCircle
                        className="size-175 animate-spin"
                        aria-hidden
                      />
                    ) : (
                      <PenLine className="size-175" aria-hidden />
                    )
                  }
                  className="h-475 rounded-full font-designer-14b disabled:bg-gray-300"
                >
                  {createPostMutation.isPending ? '올리는 중' : '글 남기기'}
                </Button>
              </div>
            </form>

            <section className="mt-200" aria-live="polite">
              {feedQuery.isLoading && <FeedLoading />}
              {feedQuery.isError && (
                <StateCard
                  title="글을 불러오지 못했어요"
                  description="잠시 후 다시 시도해주세요."
                  actionLabel="다시 시도"
                  onAction={() => feedQuery.refetch()}
                />
              )}
              {isEmpty && <EmptyFeed onWrite={focusComposer} />}
              {!feedQuery.isLoading && !feedQuery.isError && !isEmpty && (
                <ul className="space-y-125">
                  {feedQuery.data?.items.map((post) => (
                    <li
                      key={post.postId}
                      className="rounded-200 border border-gray-200 bg-white p-175"
                    >
                      <div className="flex items-center gap-100">
                        <span className="flex size-475 items-center justify-center rounded-full bg-blue-50 text-[14px] font-black text-blue-700">
                          {(post.author.name ?? '알').slice(0, 1)}
                        </span>
                        <div>
                          <p className="text-[14px] font-extrabold text-gray-900">
                            {post.author.name ?? '알 수 없는 사용자'}
                          </p>
                          <p className="font-designer-12m font-semibold text-gray-400">
                            {post.createdAt}
                          </p>
                        </div>
                      </div>
                      <h2 className="mt-125 text-[16px] font-black leading-[1.4] text-gray-900">
                        {post.title}
                      </h2>
                      <span className="mt-100 inline-flex rounded-full bg-gray-100 px-100 py-50 font-designer-12b font-extrabold text-gray-600">
                        {FEED_FILTERS.find(
                          (filter) => filter.board === post.board,
                        )?.label ?? post.board}
                      </span>
                      <p className="mt-100 line-clamp-3 font-designer-13r leading-[1.6] text-gray-600">
                        {post.excerpt}
                      </p>
                      <div className="mt-150 flex gap-200 border-t border-gray-100 pt-125 font-designer-13b font-extrabold text-gray-500">
                        <span className="flex items-center gap-50">
                          <ThumbsUp className="size-175" aria-hidden />
                          도움됨 {post.stats.likeCount}
                        </span>
                        <span className="flex items-center gap-50">
                          <MessageCircle className="size-175" aria-hidden />
                          댓글 {post.stats.commentCount}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </div>
      </div>
    </RetentionPage>
  );
}

function PinnedWelcome({ onWrite }: { onWrite: () => void }) {
  return (
    <article className="mt-150 rounded-200 border border-yellow-600/30 bg-white p-175 shadow-1">
      <span className="inline-flex items-center gap-50 rounded-full bg-yellow-100 px-100 py-50 font-designer-12b font-extrabold text-yellow-600">
        <Pin className="size-150" aria-hidden /> 방장 고정
      </span>
      <div className="mt-125 flex items-center gap-100">
        <span className="flex size-475 items-center justify-center rounded-full bg-gray-900 text-[14px] font-black text-white">
          원
        </span>
        <div>
          <p className="text-[14px] font-extrabold text-gray-900">
            제로원 방장
          </p>
          <p className="font-designer-12m font-semibold text-gray-400">
            방장 · 환영 인사
          </p>
        </div>
      </div>
      <p className="mt-125 font-designer-13r leading-[1.6] text-gray-700">
        막히면 숨기지 말고 지금 화면을 올려주세요. 무엇을 만드는지, 어디서
        막혔는지, 어떤 답이 필요한지 세 줄이면 충분해요.
      </p>
      <div className="mt-150 flex flex-wrap gap-75">
        {[
          '막힌 화면을 구체적으로',
          '작업물·에러는 가리고',
          '조롱 없이 다음 행동',
        ].map((rule) => (
          <span
            key={rule}
            className="rounded-full border border-gray-200 bg-gray-50 px-125 py-62 font-designer-12b font-bold text-gray-600"
          >
            {rule}
          </span>
        ))}
      </div>
      <div className="mt-150 flex items-center justify-between gap-100 border-t border-gray-100 pt-150">
        <span className="font-designer-12b font-bold leading-[1.5] text-gray-500">
          세 줄 질문으로 시작해도 괜찮아요.
        </span>
        <Button
          type="button"
          color="outlined"
          size="small"
          onClick={onWrite}
          className="h-400 shrink-0 rounded-full border-rose-500 bg-rose-50 px-150 font-designer-13b text-rose-700 hover:bg-rose-50 active:bg-rose-50"
        >
          세 줄 쓰기
        </Button>
      </div>
    </article>
  );
}

function FeedLoading() {
  return (
    <div className="rounded-200 border border-gray-200 bg-white p-200 font-designer-13m font-semibold text-gray-600">
      글을 불러오는 중이에요.
    </div>
  );
}

function EmptyFeed({ onWrite }: { onWrite: () => void }) {
  return (
    <div className="rounded-200 border border-dashed border-gray-300 bg-white px-250 py-350 text-center">
      <Sprout className="mx-auto size-350 text-green-600" aria-hidden />
      <h2 className="mt-100 text-[17px] font-black text-gray-900">
        아직 글이 없어요
      </h2>
      <p className="mt-75 font-designer-13r leading-[1.6] text-gray-600">
        아직 조용해도 괜찮아요. 첫 글이 다음 사람이 안전하게 들어오는 입구가
        됩니다.
      </p>
      <Button
        type="button"
        color="primary"
        size="large"
        onClick={onWrite}
        className="mt-175 h-475 rounded-full font-designer-14b"
      >
        첫 글 남기기
      </Button>
    </div>
  );
}

function StateCard({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-200 border border-gray-200 bg-white p-250 text-center">
      <h1 className="text-[18px] font-black text-gray-900">{title}</h1>
      <p className="mt-100 text-[14px] leading-[1.6] text-gray-600">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          type="button"
          color="primary"
          size="medium"
          onClick={onAction}
          icon={<RefreshCw className="size-175" aria-hidden />}
          className="mx-auto mt-200 h-450 rounded-full px-175 font-designer-14b"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
