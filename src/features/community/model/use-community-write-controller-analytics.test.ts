// @vitest-environment jsdom

import { sendGTMEvent } from '@next/third-parties/google';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMUNITY_BOARD, type CommunityBoard } from '@/types/community/domain';

const testState = vi.hoisted(() => ({
  board: 'free' as CommunityBoard,
  createPost: vi.fn(),
  createQuestion: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@hookform/resolvers/zod', () => ({ zodResolver: vi.fn() }));

vi.mock('@next/third-parties/google', () => ({
  sendGTMEvent: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: testState.routerPush,
    replace: testState.routerReplace,
  }),
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    clearErrors: vi.fn(),
    control: {},
    formState: { errors: {}, isSubmitting: false, isValid: true },
    handleSubmit:
      (
        callback: (values: {
          board: CommunityBoard;
          content: string;
          title: string;
        }) => unknown,
      ) =>
      () =>
        callback({
          board: testState.board,
          content: '<p>본문</p>',
          title: '제목',
        }),
    reset: vi.fn(),
    setError: vi.fn(),
    setFocus: vi.fn(),
    setValue: vi.fn(),
  }),
  useWatch: () => testState.board,
}));

vi.mock('@/features/auth/model/use-auth', () => ({
  useAuthReady: () => ({ isAuthenticated: true, isHydrated: true }),
}));

vi.mock('@/features/community/api/community-api', () => ({
  createCommunityIdempotencyKey: () => 'post-key',
  getCommunityErrorMessage: () => '글 저장에 실패했습니다.',
  getCommunityPostRevisionConflictMessage: () => '수정 충돌',
  getCommunityWriteContentErrorMessage: () => undefined,
  isCommunityNotFoundError: () => false,
  isCommunityPostRevisionConflictError: () => false,
}));

vi.mock('@/features/community/api/community-qna-api', () => ({
  createCommunityQnaIdempotencyKey: () => 'question-key',
  getCommunityQnaAccessDeniedMessage: () => '권한 없음',
  getCommunityQnaAuthRequiredMessage: () => '로그인 필요',
  getCommunityQnaErrorMessage: () => '질문 저장 실패',
  isCommunityQnaAccessDeniedError: () => false,
  isCommunityQnaAuthRequiredError: () => false,
}));

vi.mock('@/features/community/model/use-community-mutation', () => ({
  useCreateCommunityPostMutation: () => ({
    isPending: false,
    mutateAsync: testState.createPost,
  }),
  useUpdateCommunityPostMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/features/community/model/use-community-qna-mutation', () => ({
  useCreateCommunityQnaQuestionMutation: () => ({
    isPending: false,
    mutateAsync: testState.createQuestion,
  }),
}));

vi.mock('@/features/community/model/use-community-query', () => ({
  useCommunityPostDetailQuery: () => ({
    data: undefined,
    error: undefined,
    isError: false,
    isPending: false,
    isSuccess: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: (
    selector: (state: { showToast: typeof testState.showToast }) => unknown,
  ) => selector({ showToast: testState.showToast }),
}));

vi.mock('@/types/community/markdown', () => ({
  registerCommunityMarkdownTrustedImageUrlsFromContent: vi.fn(),
}));

import { useCommunityWriteController } from './use-community-write-controller';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Controller = ReturnType<typeof useCommunityWriteController>;
let controller: Controller | undefined;
let container: HTMLDivElement;
let root: Root;
const testDocument = document;
const testWindow = window;

function Harness({ initialRoomId }: { initialRoomId?: number }) {
  const nextController = useCommunityWriteController({
    initialBoard: testState.board,
    initialRoomId,
    mode: 'create',
  });
  useEffect(() => {
    controller = nextController;
  }, [nextController]);
  return null;
}

const mount = async (initialRoomId?: number) => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(Harness, { initialRoomId })));
};

beforeEach(() => {
  vi.stubGlobal('document', testDocument);
  vi.stubGlobal('window', testWindow);
  testState.createPost.mockResolvedValue({ postId: 91 });
  testState.createQuestion.mockResolvedValue({ id: 92 });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  controller = undefined;
  testState.board = COMMUNITY_BOARD.FREE;
});

const submit = async () => {
  await act(async () => controller?.actions.handleSubmit());
};

describe('post_create analytics', () => {
  it('sends a room-scoped post event after create succeeds', async () => {
    await mount(42);
    await submit();

    expect(sendGTMEvent).toHaveBeenCalledWith({
      event: 'post_create',
      room_id: 42,
      post_type: 'free',
    });
    expect(testState.routerPush).toHaveBeenCalled();
  });

  it('sends a qna event without room_id after question creation succeeds', async () => {
    testState.board = COMMUNITY_BOARD.QNA;
    await mount();
    await submit();

    expect(sendGTMEvent).toHaveBeenCalledWith({
      event: 'post_create',
      post_type: 'qna',
    });
  });

  it('does not send post_create when the create API rejects', async () => {
    testState.createPost.mockRejectedValue(new Error('create failed'));
    await mount(42);
    await submit();

    expect(sendGTMEvent).not.toHaveBeenCalled();
  });
});
