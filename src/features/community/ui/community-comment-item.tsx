'use client';

import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  MoreVertical,
  PencilLine,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import IconButton from '@/components/common/ui/icon-button';
import { Menu } from '@/components/common/ui/menu';
import TextActionButton from '@/components/common/ui/text-action-button';
import type {
  CommunityComment,
  CommunityCommentReactionSelection,
} from '@/types/community/domain';
import CommunityAuthorNameTrigger from './community-author-name-trigger';
import CommunityCommentForm from './community-comment-form';
import { CommunityMemberRoleBadge } from './community-meta-badge';

interface CommunityCommentItemProps {
  comment: CommunityComment;
  viewerImage: string;
  editingCommentId?: number;
  editingDraft: string;
  replyDraft: string;
  replyTargetId?: number;
  depth?: number;
  onCancelEditing: () => void;
  onCloseReply: () => void;
  onDeleteComment: (commentId: number) => void;
  onEditingDraftChange: (nextValue: string) => void;
  onOpenReply: (commentId: number) => void;
  onReplyDraftChange: (nextValue: string) => void;
  onStartEditing: (commentId: number) => void;
  onSubmitEditedComment: () => void;
  onSubmitReply: () => void;
  onToggleCommentReaction: (
    commentId: number,
    nextReaction: CommunityCommentReactionSelection,
  ) => void;
}

function CommunityCommentActionButton({
  icon,
  label,
  count,
  isActive = false,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label?: string;
  count?: number;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <TextActionButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'gap-75 border-0 p-0 font-designer-13m transition-colors disabled:cursor-not-allowed disabled:text-text-disabled',
        isActive
          ? 'text-text-strong'
          : 'text-text-subtle hover:text-text-default',
      )}
    >
      <span className="flex items-center">{icon}</span>
      {typeof count === 'number' && count > 0 ? <span>{count}</span> : null}
      {label ? <span>{label}</span> : null}
    </TextActionButton>
  );
}

export default function CommunityCommentItem({
  comment,
  viewerImage,
  editingCommentId,
  editingDraft,
  replyDraft,
  replyTargetId,
  depth = 0,
  onCancelEditing,
  onCloseReply,
  onDeleteComment,
  onEditingDraftChange,
  onOpenReply,
  onReplyDraftChange,
  onStartEditing,
  onSubmitEditedComment,
  onSubmitReply,
  onToggleCommentReaction,
}: CommunityCommentItemProps) {
  const isEditing = editingCommentId === comment.id;
  const isReplying = replyTargetId === comment.id;
  const [isReplyListExpanded, setIsReplyListExpanded] = useState(depth > 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isReplying) {
      setIsReplyListExpanded(true);
    }
  }, [isReplying]);

  useEffect(() => {
    if (isEditing) {
      setIsMenuOpen(false);
    }
  }, [isEditing]);

  const handleToggleReplies = () => {
    setIsReplyListExpanded((prevState) => !prevState);
  };

  return (
    <article className="flex flex-col gap-150">
      <div className="flex items-start gap-150">
        <div className="min-w-0 flex-1">
          <div className="relative flex items-start gap-150">
            <div
              className={cn(
                'min-w-0',
                (comment.canEdit || comment.canDelete) && 'pr-500',
              )}
            >
              <div className="flex flex-wrap items-center gap-75">
                <CommunityAuthorNameTrigger
                  memberId={comment.authorMemberId}
                  publicProfileUuid={comment.authorPublicProfileUuid}
                  name={comment.authorName}
                  image={comment.authorImage}
                  imageSize={36}
                  className="font-designer-14b text-text-strong"
                />
                <CommunityMemberRoleBadge role={comment.authorRole} />
                <span className="font-designer-13r text-text-subtlest">
                  {comment.createdAt}
                </span>
                {comment.isEdited ? (
                  <span className="font-designer-12m text-text-subtlest">
                    수정됨
                  </span>
                ) : null}
              </div>
            </div>

            {comment.canEdit || comment.canDelete ? (
              <div className="absolute top-0 right-0">
                <Menu.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <Menu.Trigger>
                    <IconButton
                      type="button"
                      size="xs"
                      label="댓글 메뉴 열기"
                      className="rounded-full text-text-subtle transition-colors hover:bg-fill-neutral-subtle-hover hover:text-text-default"
                    >
                      <MoreVertical className="h-200 w-200" />
                    </IconButton>
                  </Menu.Trigger>
                  <Menu.Content align="end">
                    {comment.canEdit ? (
                      <Menu.Item
                        icon={<PencilLine className="h-200 w-200" />}
                        onSelect={() => onStartEditing(comment.id)}
                      >
                        수정
                      </Menu.Item>
                    ) : null}
                    {comment.canDelete ? (
                      <Menu.Item
                        icon={<Trash2 className="h-200 w-200" />}
                        onSelect={() => onDeleteComment(comment.id)}
                        tone="danger"
                      >
                        삭제
                      </Menu.Item>
                    ) : null}
                  </Menu.Content>
                </Menu.Root>
              </div>
            ) : null}
          </div>

          {isEditing ? (
            <div className="mt-150">
              <CommunityCommentForm
                authorImage={viewerImage}
                placeholder="댓글을 수정해보세요."
                submitLabel="수정 저장"
                value={editingDraft}
                onChange={onEditingDraftChange}
                onSubmit={onSubmitEditedComment}
                onCancel={onCancelEditing}
                autoFocus={true}
                isCompact={true}
              />
            </div>
          ) : (
            <>
              <p className="mt-75 font-designer-15r leading-300 whitespace-pre-wrap text-text-default">
                {comment.content}
              </p>

              <div className="mt-150 flex flex-wrap items-center gap-x-150 gap-y-100">
                <CommunityCommentActionButton
                  icon={
                    <ThumbsUp
                      className={cn(
                        'h-200 w-200',
                        comment.viewerReaction === 'like'
                          ? 'fill-current'
                          : undefined,
                      )}
                    />
                  }
                  count={comment.likeCount}
                  disabled={comment.isDeleted}
                  isActive={comment.viewerReaction === 'like'}
                  onClick={() => onToggleCommentReaction(comment.id, 'like')}
                />
                <CommunityCommentActionButton
                  icon={
                    <ThumbsDown
                      className={cn(
                        'h-200 w-200',
                        comment.viewerReaction === 'dislike'
                          ? 'fill-current'
                          : undefined,
                      )}
                    />
                  }
                  count={comment.dislikeCount}
                  disabled={comment.isDeleted}
                  isActive={comment.viewerReaction === 'dislike'}
                  onClick={() => onToggleCommentReaction(comment.id, 'dislike')}
                />
                {comment.canReply ? (
                  <CommunityCommentActionButton
                    icon={<MessageCircle className="h-200 w-200" />}
                    label="답글"
                    onClick={() => onOpenReply(comment.id)}
                  />
                ) : null}
              </div>
            </>
          )}

          {isReplying ? (
            <div className="mt-150">
              <CommunityCommentForm
                authorImage={viewerImage}
                placeholder="답글을 남겨보세요."
                submitLabel="답글 등록"
                value={replyDraft}
                onChange={onReplyDraftChange}
                onSubmit={onSubmitReply}
                onCancel={onCloseReply}
                autoFocus={true}
                isCompact={true}
              />
            </div>
          ) : null}

          {comment.replies.length > 0 ? (
            <div className="mt-100">
              <TextActionButton
                type="button"
                onClick={handleToggleReplies}
                className="gap-75 border-0 p-0 font-designer-13b text-text-default transition-colors hover:text-text-strong"
              >
                <span>답글 {comment.replies.length}개</span>
                {isReplyListExpanded ? (
                  <ChevronUp className="h-200 w-200" />
                ) : (
                  <ChevronDown className="h-200 w-200" />
                )}
              </TextActionButton>

              {isReplyListExpanded ? (
                <div
                  className={cn(
                    'mt-100 flex flex-col gap-150 border-l border-border-default pl-200',
                    depth > 0 && 'ml-200',
                  )}
                >
                  {comment.replies.map((reply) => (
                    <CommunityCommentItem
                      key={reply.id}
                      comment={reply}
                      depth={depth + 1}
                      viewerImage={viewerImage}
                      editingCommentId={editingCommentId}
                      editingDraft={editingDraft}
                      replyDraft={replyDraft}
                      replyTargetId={replyTargetId}
                      onCancelEditing={onCancelEditing}
                      onCloseReply={onCloseReply}
                      onDeleteComment={onDeleteComment}
                      onEditingDraftChange={onEditingDraftChange}
                      onOpenReply={onOpenReply}
                      onReplyDraftChange={onReplyDraftChange}
                      onStartEditing={onStartEditing}
                      onSubmitEditedComment={onSubmitEditedComment}
                      onSubmitReply={onSubmitReply}
                      onToggleCommentReaction={onToggleCommentReaction}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
