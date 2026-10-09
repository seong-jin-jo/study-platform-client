'use client';

import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Share,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Avatar from '@/components/common/ui/avatar';
import Button from '@/components/common/ui/button';
import PageContainer from '@/components/common/ui/page-container';
import TextActionButton from '@/components/common/ui/text-action-button';
import JoinCommunityRoomModal from '@/components/community/modals/join-community-room-modal';
import SaveResourceButton from '@/components/saved-resource/save-resource-button';
import { buildCommunityListHref } from '@/features/community/model/community-route';
import { useCommunityDetailController } from '@/features/community/model/use-community-detail-controller';
import { useIntersectionObserver } from '@/hooks/common/use-intersection-observer';
import {
  useCommunityRoomDetailQuery,
  useCommunityRoomHubQuery,
} from '@/hooks/queries/community/use-community-room-hub-query';
import { useUserStore } from '@/stores/use-user-store';
import type { CommunityBoard } from '@/types/community/domain';
import type { CommunitySeoPreview } from '@/types/community/seo';
import { SAVED_RESOURCE_TYPE } from '@/types/saved-resource';
import { getDefaultAvatarSrc } from '@/utils/avatar-utils';
import CommunityAuthorNameTrigger from '../community-author-name-trigger';
import CommunityCommentSection from '../community-comment-section';
import CommunityDetailBodySection from '../community-detail-body-section';
import CommunityDetailFeedSection from '../community-detail-feed-section';
import {
  CommunityBoardBadge,
  CommunityMemberRoleBadge,
} from '../community-meta-badge';
import CommunityPostOwnerActions from '../community-post-owner-actions';
import CommunityReactionButton from '../community-reaction-button';
import CommunitySectionShell from '../community-section-shell';

interface CommunityDetailPageClientProps {
  postId: number;
  returnBoard?: CommunityBoard;
  returnPage?: number;
  initialSeoPreview?: CommunitySeoPreview;
}

export default function CommunityDetailPageClient({
  postId,
  returnBoard,
  returnPage,
  initialSeoPreview,
}: CommunityDetailPageClientProps) {
  const { state, actions, viewModel } = useCommunityDetailController({
    postId,
  });
  const viewerImage = useUserStore((store) => store.profileImageUrl);
  const memberId = useUserStore((store) => store.memberId);
  const teaserAccess =
    state.post?.access?.mode === 'TEASER' ? state.post.access : undefined;
  const postRoomId =
    state.post?.access?.roomId ?? initialSeoPreview?.sourceRoom?.roomId;
  const roomQuery = useCommunityRoomDetailQuery(postRoomId ?? 0);
  const roomHubQuery = useCommunityRoomHubQuery({}, Boolean(teaserAccess));
  const [isFeedVisible, setIsFeedVisible] = useState(false);
  const backHref = postRoomId
    ? `/community/rooms/${postRoomId}`
    : buildCommunityListHref(returnPage, returnBoard);
  const backLabel = postRoomId
    ? `${roomQuery.data?.name ?? initialSeoPreview?.sourceRoom?.name ?? '이 방'} 방으로 돌아가기`
    : '커뮤니티로 돌아가기';
  const postRoomName =
    roomQuery.data?.name ?? initialSeoPreview?.sourceRoom?.name;
  const feedTriggerRef = useIntersectionObserver(
    () => {
      setIsFeedVisible(true);
    },
    {
      enabled: !isFeedVisible,
      rootMargin: '320px 0px',
      threshold: 0,
    },
  );

  useEffect(() => {
    if (postId > 0) {
      setIsFeedVisible(false);
    }
  }, [postId]);

  if (!state.isResolved) {
    if (initialSeoPreview) {
      return (
        <PageContainer className="flex flex-col gap-400 px-175 py-175 md:px-250 md:py-225 xl:gap-500 xl:px-350 xl:py-275">
          <CommunitySectionShell className="gap-200 border-b border-border-default pb-300">
            <Link
              href={backHref}
              className="zeroone-post-back-link inline-flex items-center gap-75 text-text-subtle transition-colors hover:text-text-default"
            >
              <ChevronLeft className="h-200 w-200" />
              {backLabel}
            </Link>
            {initialSeoPreview.sourceRoom ? (
              <span className="zeroone-post-room-tag mt-200 self-start rounded-full bg-background-alternative text-text-subtle">
                {initialSeoPreview.sourceRoom.name}
              </span>
            ) : null}
            <h1 className="zeroone-post-title text-text-strong">
              {initialSeoPreview.title}
            </h1>
            <div className="zeroone-post-meta flex items-center gap-100 text-text-subtle">
              <span>{initialSeoPreview.author.nickname}</span>
              <span className="text-text-subtlest">·</span>
              <time dateTime={initialSeoPreview.publishedAt}>
                {new Date(initialSeoPreview.publishedAt).toLocaleDateString(
                  'ko-KR',
                )}
              </time>
              <SaveResourceButton
                className="ml-auto"
                compact={true}
                resourceKey={String(initialSeoPreview.postId)}
                resourceType={SAVED_RESOURCE_TYPE.COMMUNITY_POST}
              />
            </div>
          </CommunitySectionShell>
          <CommunitySectionShell className="gap-300">
            {initialSeoPreview.accessMode === 'FULL' &&
            initialSeoPreview.publicBodyHtml ? (
              <div
                className="zeroone-post-body text-text-default"
                dangerouslySetInnerHTML={{
                  __html: initialSeoPreview.publicBodyHtml,
                }}
              />
            ) : (
              <p className="zeroone-gated-preview text-text-default">
                {initialSeoPreview.previewText}
              </p>
            )}
          </CommunitySectionShell>
          {initialSeoPreview.accessMode === 'TEASER' ? (
            <CommunitySectionShell className="zeroone-post-gate items-center rounded-200 border border-border-default bg-background-default text-center">
              <h2 className="zeroone-post-gate-title text-text-strong">
                이 방에 정착하면 나머지와 답변까지 전부 보여요
              </h2>
              <p className="zeroone-post-gate-description text-text-subtle">
                지금 답변 3개가 달려 있어요. 정착하면 여기에 직접 물어볼 수도
                있어요.
              </p>
              <Link
                href={
                  initialSeoPreview.sourceRoom
                    ? `/community/rooms/${initialSeoPreview.sourceRoom.roomId}`
                    : '/community'
                }
                className="zeroone-post-gate-action flex w-full items-center justify-center bg-fill-brand-default-default px-225 text-text-inverse transition-colors hover:bg-fill-brand-default-hover"
              >
                정착하고 마저 읽기
              </Link>
            </CommunitySectionShell>
          ) : null}
        </PageContainer>
      );
    }

    return (
      <PageContainer className="flex flex-col gap-500 px-175 py-175 md:px-250 md:py-225 xl:gap-600 xl:px-350 xl:py-275">
        <CommunitySectionShell className="gap-250">
          <p className="font-designer-16r text-text-subtle">
            글을 불러오는 중입니다.
          </p>
        </CommunitySectionShell>
      </PageContainer>
    );
  }

  if (state.errorMessage) {
    if (state.isQnaRouteMismatch) {
      return (
        <PageContainer className="flex flex-col gap-400 px-175 py-175 md:px-250 md:py-225 xl:gap-500 xl:px-350 xl:py-275">
          <section className="rounded-200 border border-dashed border-border-default bg-background-default px-250 py-425 text-center">
            <h1 className="font-designer-15b text-text-strong">
              이 글은 다른 자리에 있어요
            </h1>
            <p className="mt-75 font-designer-13r leading-250 text-text-subtle">
              묻고 답하는 글이라 그 방의 질문 목록에서 열려요.
              <br />
              버튼을 누르면 바로 그 자리로 갑니다.
            </p>
            <Link
              href={`/community/questions/${postId}`}
              className="mt-200 inline-flex min-h-575 items-center rounded-150 bg-fill-brand-default-default px-225 font-designer-14b text-text-inverse"
            >
              질문 목록으로 가기
            </Link>
            <Link
              href="/home"
              className="mx-auto mt-75 block font-designer-14m text-text-subtle underline underline-offset-3"
            >
              홈으로
            </Link>
          </section>
        </PageContainer>
      );
    }

    return (
      <PageContainer className="flex flex-col gap-500 px-175 py-175 md:px-250 md:py-225 xl:gap-600 xl:px-350 xl:py-275">
        <CommunitySectionShell className="gap-250">
          <Link
            href={backHref}
            className="zeroone-post-back-link inline-flex items-center gap-75 text-text-subtle transition-colors hover:text-text-default"
          >
            <ChevronLeft className="h-200 w-200" />
            {backLabel}
          </Link>
          <div className="rounded-200 border border-border-default bg-background-default p-300">
            <p className="font-designer-20b text-text-strong">
              글을 불러오지 못했습니다.
            </p>
            <p className="mt-100 font-designer-14r text-text-subtle">
              {state.errorMessage}
            </p>
          </div>
        </CommunitySectionShell>
      </PageContainer>
    );
  }

  if (!state.post) {
    return (
      <PageContainer className="flex flex-col gap-500 px-175 py-175 md:px-250 md:py-225 xl:gap-600 xl:px-350 xl:py-275">
        <CommunitySectionShell className="gap-250">
          <Link
            href={backHref}
            className="zeroone-post-back-link inline-flex items-center gap-75 text-text-subtle transition-colors hover:text-text-default"
          >
            <ChevronLeft className="h-200 w-200" />
            {backLabel}
          </Link>
          <div className="rounded-200 border border-border-default bg-background-default p-300">
            <p className="font-designer-20b text-text-strong">
              글을 찾을 수 없어요.
            </p>
            <p className="mt-100 font-designer-14r text-text-subtle">
              목록으로 돌아가 다른 글을 확인해 주세요.
            </p>
          </div>
        </CommunitySectionShell>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-400 px-175 py-175 md:px-250 md:py-225 xl:gap-500 xl:px-350 xl:py-275">
      <CommunitySectionShell className="gap-200 border-b border-border-default pb-300">
        <Link
          href={backHref}
          className="zeroone-post-back-link inline-flex items-center gap-75 text-text-subtle transition-colors hover:text-text-default"
        >
          <ChevronLeft className="h-200 w-200" />
          {backLabel}
        </Link>

        {postRoomName ? (
          <span className="zeroone-post-room-tag mt-200 self-start rounded-full bg-background-alternative text-text-subtle">
            {postRoomName}
          </span>
        ) : (
          <div className="mt-200 self-start">
            <CommunityBoardBadge board={state.post.board} />
          </div>
        )}

        <div className="flex items-start justify-between gap-150">
          <h1 className="zeroone-post-title min-w-0 flex-1 text-text-strong">
            {state.post.title}
          </h1>
          <CommunityPostOwnerActions
            currentPage={returnPage}
            post={state.post}
          />
        </div>

        <div className="zeroone-post-meta flex flex-wrap items-center gap-100 text-text-subtle">
          <Avatar
            image={state.post.authorImage}
            alt={state.post.authorName}
            size={24}
            fallbackSrc={getDefaultAvatarSrc(state.post.authorMemberId)}
          />
          <CommunityAuthorNameTrigger
            memberId={state.post.authorMemberId}
            publicProfileUuid={state.post.authorPublicProfileUuid}
            name={state.post.authorName}
            className="font-designer-14m text-text-default"
          />
          <CommunityMemberRoleBadge role={state.post.role} />
          <span className="text-text-subtlest">·</span>
          <span>{state.post.createdAt}</span>
          <span className="text-text-subtlest">·</span>
          <span className="flex items-center gap-50">
            <Eye className="h-200 w-200" />
            {state.post.viewCount}
          </span>
          <span className="text-text-subtlest">·</span>
          <span className="flex items-center gap-50">
            <MessageCircle className="h-200 w-200" />
            {viewModel.commentCount}
          </span>
          <SaveResourceButton
            className="ml-auto"
            compact={true}
            resourceKey={String(state.post.id)}
            resourceType={SAVED_RESOURCE_TYPE.COMMUNITY_POST}
          />
        </div>
      </CommunitySectionShell>

      {state.post.insightQuote && (
        <Link
          href={`/insights/${encodeURIComponent(state.post.insightQuote.slug)}`}
          className="group flex items-start justify-between gap-200 rounded-200 border border-border-default bg-background-default p-250 transition-colors hover:border-border-strong"
        >
          <div className="flex min-w-0 items-start gap-150">
            <div className="flex h-400 w-400 shrink-0 items-center justify-center rounded-150 bg-background-subtle text-text-subtle">
              <BookOpenText className="h-200 w-200" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-designer-12m text-text-subtle">
                이 질문이 시작된 인사이트
              </p>
              <p className="mt-50 font-designer-16b text-text-strong">
                {state.post.insightQuote.title}
              </p>
              <p className="mt-50 line-clamp-2 font-designer-14r text-text-subtle">
                {state.post.insightQuote.excerpt}
              </p>
            </div>
          </div>
          <ChevronRight
            className="mt-100 h-200 w-200 shrink-0 text-text-subtlest transition-transform group-hover:translate-x-25"
            aria-hidden="true"
          />
        </Link>
      )}

      <CommunityDetailBodySection
        postId={state.post.id}
        title={state.post.title}
        contentHtml={state.post.contentHtml ?? undefined}
        content={state.post.content}
        previewImage={state.post.previewImage}
        previewImageAlt={state.post.previewImageAlt}
        isPreview={Boolean(teaserAccess)}
      />

      {teaserAccess ? (
        <CommunitySectionShell className="zeroone-post-gate items-center rounded-200 border border-border-default bg-background-default text-center">
          <h2 className="zeroone-post-gate-title text-text-strong">
            이 방에 정착하면 나머지와 답변까지 전부 보여요
          </h2>
          <p className="zeroone-post-gate-description text-text-subtle">
            지금 답변 {state.post.commentCount}개가 달려 있어요. 정착하면 여기에
            직접 물어볼 수도 있어요.
          </p>
          {roomQuery.data && roomHubQuery.data ? (
            <JoinCommunityRoomModal
              activeRoomCount={roomHubQuery.data.activeRoomCount}
              activeRoomLimit={roomHubQuery.data.activeRoomLimit}
              activeRooms={roomHubQuery.data.myRooms}
              room={roomQuery.data}
              onJoined={async () => {
                await actions.handleRoomJoined();
              }}
              trigger={
                <Button
                  type="button"
                  color="primary"
                  size="large"
                  data-testid="community-post-gate-join"
                  className="zeroone-post-gate-action w-full px-225"
                >
                  정착하고 마저 읽기
                </Button>
              }
            />
          ) : roomQuery.isError || roomHubQuery.isError ? (
            <Link
              href={`/community/rooms/${teaserAccess.roomId}`}
              data-testid="community-post-gate-room-link"
              className="zeroone-post-gate-action flex w-full items-center justify-center bg-fill-brand-default-default px-225 text-text-inverse"
            >
              방으로 이동해 입장하기
            </Link>
          ) : (
            <p className="mt-200 font-designer-13m text-text-subtlest">
              입장 정보를 불러오는 중입니다.
            </p>
          )}
        </CommunitySectionShell>
      ) : null}

      {state.hasFullAccess ? (
        <div className="flex items-center gap-200 self-start rounded-100">
          <CommunityReactionButton
            isActive={viewModel.isLikedByViewer}
            count={viewModel.reactionCount}
            onClick={actions.handleToggleLike}
            ariaLabel={viewModel.isLikedByViewer ? '좋아요 취소' : '좋아요'}
          />
          <TextActionButton
            type="button"
            onClick={actions.handleSharePost}
            className="gap-75 border-0 p-0 font-designer-14m text-text-subtle transition-colors hover:text-text-default"
          >
            <Share className="h-200 w-200" />
            공유
          </TextActionButton>
        </div>
      ) : null}

      {state.hasFullAccess ? (
        <CommunityCommentSection
          comments={viewModel.comments}
          commentCount={viewModel.commentCount}
          commentPlaceholder={
            state.isAuthenticated
              ? '댓글을 남겨보세요.'
              : '로그인 후 댓글을 남길 수 있습니다.'
          }
          currentPage={viewModel.currentCommentsPage}
          errorMessage={state.commentsErrorMessage}
          isAuthenticated={state.isAuthenticated}
          isLoading={state.isCommentsLoading}
          isCommentDisabled={!state.isAuthenticated}
          resetKey={state.commentInteractionResetKey}
          showPagination={viewModel.showCommentPagination}
          totalPages={viewModel.totalCommentPages}
          viewerImage={viewerImage ?? getDefaultAvatarSrc(memberId)}
          onChangePage={actions.handleCommentPageChange}
          onDeleteComment={actions.handleDeleteComment}
          onSubmitComment={actions.handleSubmitComment}
          onSubmitEditedComment={actions.handleSubmitEditedComment}
          onSubmitReply={actions.handleSubmitReply}
          onToggleCommentReaction={actions.handleToggleCommentReaction}
        />
      ) : null}

      <div
        ref={(node) => {
          feedTriggerRef.current = node;
        }}
        aria-hidden="true"
        className="h-px w-full"
      />

      <CommunityDetailFeedSection
        currentPostId={state.post.id}
        isVisible={isFeedVisible}
      />
    </PageContainer>
  );
}
