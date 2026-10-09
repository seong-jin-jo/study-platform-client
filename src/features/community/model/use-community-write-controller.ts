'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { sendGTMEvent } from '@next/third-parties/google';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useAuthReady } from '@/features/auth/model/use-auth';
import {
  createCommunityIdempotencyKey,
  getCommunityErrorMessage,
  getCommunityPostRevisionConflictMessage,
  getCommunityWriteContentErrorMessage,
  isCommunityNotFoundError,
  isCommunityPostRevisionConflictError,
} from '@/features/community/api/community-api';
import {
  createCommunityQnaIdempotencyKey,
  getCommunityQnaAccessDeniedMessage,
  getCommunityQnaAuthRequiredMessage,
  getCommunityQnaErrorMessage,
  isCommunityQnaAccessDeniedError,
  isCommunityQnaAuthRequiredError,
} from '@/features/community/api/community-qna-api';
import {
  useCreateCommunityPostMutation,
  useUpdateCommunityPostMutation,
} from '@/features/community/model/use-community-mutation';
import { useCreateCommunityQnaQuestionMutation } from '@/features/community/model/use-community-qna-mutation';
import { useCommunityPostDetailQuery } from '@/features/community/model/use-community-query';
import { useToastStore } from '@/stores/use-toast-store';
import {
  COMMUNITY_BOARD,
  type CommunityBoard,
  isCommunityBoard,
} from '@/types/community/domain';
import { registerCommunityMarkdownTrustedImageUrlsFromContent } from '@/types/community/markdown';
import {
  type CommunityWriteFormValues,
  communityWriteSchema,
} from '@/types/schemas/community-write-schema';
import {
  buildCommunityListHref,
  buildCommunityPostHref,
  buildCommunityQuestionHref,
} from './community-route';
import { COMMUNITY_BOARD_OPTIONS } from './community-view-config';

export type CommunityWriteMode = 'create' | 'edit';

interface UseCommunityWriteControllerParams {
  initialBoard?: CommunityBoard;
  initialCohortId?: number;
  initialRoomId?: number;
  initialInsightReference?: {
    documentId: string;
    title: string;
    slug: string;
  };
  mode: CommunityWriteMode;
  postId?: number;
  returnPage?: number;
}

const isGeneralCommunityWriteBoard = (
  board: string,
): board is Exclude<
  CommunityWriteFormValues['board'],
  typeof COMMUNITY_BOARD.QNA
> => isCommunityBoard(board) && board !== COMMUNITY_BOARD.QNA;

const resolveInitialBoard = (
  initialBoard: CommunityBoard | undefined,
): CommunityWriteFormValues['board'] =>
  initialBoard && isCommunityBoard(initialBoard)
    ? initialBoard
    : COMMUNITY_BOARD.FREE;

export const useCommunityWriteController = ({
  initialBoard,
  initialCohortId,
  initialRoomId,
  initialInsightReference,
  mode,
  postId,
  returnPage,
}: UseCommunityWriteControllerParams) => {
  const unsupportedBoardMessage =
    '지원하지 않는 게시판 타입의 글이라 수정할 수 없습니다.';
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);
  const { isAuthenticated, isHydrated } = useAuthReady();
  const createPostMutation = useCreateCommunityPostMutation();
  const createQuestionMutation = useCreateCommunityQnaQuestionMutation();
  const updatePostMutation = useUpdateCommunityPostMutation();
  const isEditMode = mode === 'edit';
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const scopedInitialBoard =
    (initialCohortId || initialRoomId) && initialBoard === COMMUNITY_BOARD.QNA
      ? undefined
      : initialBoard;
  const initializedEditablePostIdRef = useRef<number | undefined>(undefined);
  const editablePostQuery = useCommunityPostDetailQuery(
    postId ?? 0,
    isHydrated && isAuthenticated && isEditMode && Boolean(postId),
  );
  const form = useForm<CommunityWriteFormValues>({
    resolver: zodResolver(communityWriteSchema),
    mode: 'onChange',
    defaultValues: {
      board: resolveInitialBoard(scopedInitialBoard),
      title: initialInsightReference
        ? `${initialInsightReference.title} 읽다가 막혔어요`
        : '',
      content: initialInsightReference
        ? '<p>인사이트를 읽다가 막혀서 질문합니다.</p><p>제가 이해한 데까지와 막힌 지점, 시도한 내용을 적어주세요.</p>'
        : '',
    },
  });
  const selectedBoard = useWatch({
    control: form.control,
    name: 'board',
  });
  const backHref =
    isEditMode && postId
      ? buildCommunityPostHref(postId, returnPage)
      : initialRoomId
        ? `/community/rooms/${initialRoomId}`
        : initialCohortId
          ? `/community/rooms/${initialCohortId}`
          : buildCommunityListHref(returnPage);

  useEffect(() => {
    if (!isHydrated || isAuthenticated) {
      return;
    }

    router.replace('/login');
  }, [isAuthenticated, isHydrated, router]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: route param 변경 시 수정 초기화가 필요하다.
  useEffect(() => {
    initializedEditablePostIdRef.current = undefined;
  }, [postId]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !isEditMode || !postId) {
      return;
    }

    if (editablePostQuery.isSuccess) {
      if (!editablePostQuery.data.canEdit) {
        router.replace(buildCommunityPostHref(postId, returnPage));

        return;
      }

      if (!isGeneralCommunityWriteBoard(editablePostQuery.data.board)) {
        showToast(unsupportedBoardMessage, 'error');
        router.replace(buildCommunityPostHref(postId, returnPage));

        return;
      }

      if (initializedEditablePostIdRef.current === postId) {
        return;
      }

      registerCommunityMarkdownTrustedImageUrlsFromContent(
        editablePostQuery.data.contentHtml ?? '',
      );
      form.reset({
        board: editablePostQuery.data.board,
        title: editablePostQuery.data.title,
        content: editablePostQuery.data.contentHtml ?? '',
      });
      initializedEditablePostIdRef.current = postId;
    }
  }, [
    editablePostQuery.data,
    editablePostQuery.isSuccess,
    form,
    isAuthenticated,
    isEditMode,
    isHydrated,
    postId,
    returnPage,
    router,
    showToast,
  ]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !isEditMode || !postId) {
      return;
    }

    if (!editablePostQuery.isError) {
      return;
    }

    if (isCommunityNotFoundError(editablePostQuery.error)) {
      router.replace('/community');

      return;
    }

    showToast(
      getCommunityErrorMessage(
        editablePostQuery.error,
        '글 정보를 불러오지 못했습니다.',
      ),
      'error',
    );
    router.replace(buildCommunityPostHref(postId, returnPage));
  }, [
    editablePostQuery.error,
    editablePostQuery.isError,
    isAuthenticated,
    isEditMode,
    isHydrated,
    postId,
    returnPage,
    router,
    showToast,
  ]);

  const handleBoardChange = (nextBoard: CommunityWriteFormValues['board']) => {
    form.setValue('board', nextBoard, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleCancel = () => {
    router.push(backHref);
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('content');

    try {
      if (isEditMode && postId) {
        const editablePost = editablePostQuery.data;

        if (!editablePost?.revision) {
          // 글 정보(revision)가 아직 없으면 조용히 끝내지 말고 사용자에게 알린다.
          showToast(
            '글 정보를 다시 불러오는 중입니다. 잠시 후 다시 시도해 주세요.',
            'error',
          );

          return;
        }

        const updatedPost = await updatePostMutation.mutateAsync({
          postId,
          revision: editablePost.revision,
          request: {
            board: values.board,
            contentHtml: values.content,
            title: values.title,
          },
        });

        router.push(buildCommunityPostHref(updatedPost.postId, returnPage));

        return;
      }

      if (values.board === COMMUNITY_BOARD.QNA) {
        const createdQuestion = await createQuestionMutation.mutateAsync({
          request: {
            title: values.title,
            contentHtml: values.content,
          },
          idempotencyKey:
            createCommunityQnaIdempotencyKey('community-question'),
        });

        sendGTMEvent({
          event: 'post_create',
          post_type: values.board,
        });
        router.push(buildCommunityQuestionHref(createdQuestion.id, returnPage));

        return;
      }

      const postType = initialInsightReference ? 'question' : values.board;
      const createdPost = await createPostMutation.mutateAsync({
        request: {
          board: postType,
          cohortId: initialCohortId,
          roomId: selectedRoomId,
          insightReference: initialInsightReference
            ? { documentId: initialInsightReference.documentId }
            : undefined,
          contentHtml: values.content,
          title: values.title,
        },
        idempotencyKey: createCommunityIdempotencyKey('community-post'),
      });

      sendGTMEvent({
        event: 'post_create',
        ...(selectedRoomId ? { room_id: selectedRoomId } : {}),
        post_type: postType,
      });
      router.push(buildCommunityPostHref(createdPost.postId, returnPage));
    } catch (error) {
      const contentErrorMessage = getCommunityWriteContentErrorMessage(error);

      if (contentErrorMessage) {
        form.setError('content', {
          type: 'server',
          message: contentErrorMessage,
        });
        form.setFocus('content');

        return;
      }

      if (!isEditMode && isCommunityQnaAuthRequiredError(error)) {
        showToast(getCommunityQnaAuthRequiredMessage('질문을 작성'), 'info');
        router.replace('/login');

        return;
      }

      if (!isEditMode && isCommunityQnaAccessDeniedError(error)) {
        showToast(getCommunityQnaAccessDeniedMessage('질문을 작성'), 'error');
        router.replace(backHref);

        return;
      }

      if (isEditMode && postId && isCommunityPostRevisionConflictError(error)) {
        const latestPostQuery = await editablePostQuery.refetch();
        const latestPost = latestPostQuery.data;

        if (
          latestPost?.canEdit &&
          isGeneralCommunityWriteBoard(latestPost.board)
        ) {
          registerCommunityMarkdownTrustedImageUrlsFromContent(
            latestPost.contentHtml ?? '',
          );
          form.reset({
            board: latestPost.board,
            title: latestPost.title,
            content: latestPost.contentHtml ?? '',
          });
          initializedEditablePostIdRef.current = postId;
        }

        if (
          latestPost?.canEdit &&
          !isGeneralCommunityWriteBoard(latestPost.board)
        ) {
          showToast(unsupportedBoardMessage, 'error');
          router.replace(buildCommunityPostHref(postId, returnPage));

          return;
        }

        showToast(getCommunityPostRevisionConflictMessage(), 'error');

        return;
      }

      showToast(
        values.board === COMMUNITY_BOARD.QNA
          ? getCommunityQnaErrorMessage(error, '질문 저장에 실패했습니다.')
          : getCommunityErrorMessage(error, '글 저장에 실패했습니다.'),
        'error',
      );
    }
  });

  const isLoadingEditablePost = isEditMode && editablePostQuery.isPending;
  const isSubmitting =
    form.formState.isSubmitting ||
    createQuestionMutation.isPending ||
    createPostMutation.isPending ||
    updatePostMutation.isPending;

  return {
    form,
    state: {
      isAccessReady:
        isHydrated &&
        isAuthenticated &&
        (!isEditMode || Boolean(editablePostQuery.data)),
      isSubmitting,
    },
    actions: {
      handleBoardChange,
      handleCancel,
      handleRoomChange: setSelectedRoomId,
      handleSubmit,
    },
    viewModel: {
      backHref,
      boardOptions:
        initialCohortId || initialRoomId
          ? COMMUNITY_BOARD_OPTIONS.filter(
              (option) => option.id !== COMMUNITY_BOARD.QNA,
            )
          : COMMUNITY_BOARD_OPTIONS,
      contentError: form.formState.errors.content?.message,
      isSubmitDisabled:
        !form.formState.isValid ||
        isSubmitting ||
        isLoadingEditablePost ||
        (!isEditMode &&
          selectedBoard !== COMMUNITY_BOARD.QNA &&
          !selectedRoomId),
      insightReference: initialInsightReference,
      pageDescription: isEditMode
        ? '글 수정'
        : initialInsightReference
          ? '인사이트에서 이어온 질문'
          : '글 작성',
      pageTitle: isEditMode
        ? '커뮤니티 글 수정'
        : initialInsightReference
          ? '내 방에 질문하기'
          : '커뮤니티 글 작성',
      selectedBoard: selectedBoard ?? resolveInitialBoard(scopedInitialBoard),
      selectedRoomId,
      submitLabel: isEditMode ? '수정 완료' : '등록하기',
      titleError: form.formState.errors.title?.message,
    },
  };
};
