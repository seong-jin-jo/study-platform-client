// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  progressMutate: vi.fn(),
  showToast: vi.fn(),
  triggerReadCelebration: vi.fn(),
}));

vi.mock('@next/third-parties/google', () => ({
  sendGTMEvent: vi.fn(),
}));

vi.mock('@/api/endpoints/insights/insight-worldmap-api', () => ({
  recordInsightView: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/components/saved-resource/save-resource-button', () => ({
  default: () => null,
}));

vi.mock('@/components/common/ui/toggle/button', () => ({
  default: ({
    children,
    onPressedChange,
  }: {
    children: ReactNode;
    onPressedChange: () => void;
  }) => createElement('button', { onClick: onPressedChange }, children),
}));

vi.mock('@/components/insights/article-celebration', () => ({
  triggerReadCelebration: testState.triggerReadCelebration,
}));

vi.mock('@/hooks/queries/insights/use-insight-worldmap-query', () => ({
  useInsightHelpfulMutation: () => ({ isPending: false, mutate: vi.fn() }),
  useInsightMapQuery: () => ({
    data: {
      islands: [
        {
          articles: [
            {
              documentId: 'document-1',
              socialProof: {
                explorerCount: 10,
                helpfulByMe: false,
                helpfulCount: 3,
                viewCount: 20,
              },
              state: 'UNLOCKED',
            },
            {
              documentId: 'document-2',
              slug: 'next-article',
              socialProof: {
                explorerCount: 8,
                helpfulByMe: false,
                helpfulCount: 2,
                viewCount: 15,
              },
              state: 'NEXT',
              title: '다음 글',
            },
          ],
          bridgeRoomId: 8,
          name: '배포와 운영',
          slug: 'deployment-operations',
        },
      ],
    },
  }),
  useInsightProgressMutation: () => ({
    mutate: testState.progressMutate,
    status: 'idle',
  }),
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: (
    selector: (state: { showToast: typeof testState.showToast }) => unknown,
  ) => selector({ showToast: testState.showToast }),
}));

import InsightArticleActions from './insight-article-actions';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const testDocument = document;
const testWindow = window;
let container: HTMLDivElement;
let root: Root;
let intersectionCallback: IntersectionObserverCallback | undefined;

class IntersectionObserverStub {
  public disconnect = vi.fn();
  public observe = vi.fn();

  public constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
}

const renderGuestActions = async () => {
  await act(async () =>
    root.render(
      createElement(InsightArticleActions, {
        articleSlug: 'deploy-first',
        documentId: 'document-1',
        fallback: {
          islandId: 1,
          islandName: '배포와 운영',
          islandSlug: 'deployment-operations',
        },
      }),
    ),
  );
};

const emitIntersection = async (isIntersecting: boolean) => {
  const callback = intersectionCallback;
  expect(callback).toBeDefined();
  await act(async () =>
    callback?.(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
};

beforeEach(() => {
  vi.stubGlobal('document', testDocument);
  vi.stubGlobal('window', testWindow);
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  intersectionCallback = undefined;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe('비회원 완독 인라인 문구', () => {
  it('GUEST-COMPLETION-002 sentinel 도달 뒤 문구를 status로 보여주고 도움됨 토스트를 보존한다', async () => {
    await renderGuestActions();

    await emitIntersection(true);

    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      '여기까지 다 읽으셨어요. 로그인하면 완독 기록이 남아요.',
    );
    expect(testState.triggerReadCelebration).toHaveBeenCalledOnce();
    expect(testState.showToast).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-testid="insight-completion-next"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="insight-completion-koan"]'),
    ).not.toBeNull();

    const helpfulButton = Array.from(container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.includes('도움됐어요'),
    );
    await act(async () => helpfulButton?.click());

    expect(testState.showToast).toHaveBeenCalledOnce();
    expect(testState.showToast).toHaveBeenCalledWith(
      '로그인하면 도움됨을 남길 수 있어요.',
      'error',
    );
  });

  it('GUEST-COMPLETION-003 sentinel 미도달 입력은 완독 문구와 컨페티를 거절한다', async () => {
    await renderGuestActions();

    await emitIntersection(false);

    expect(container.textContent).not.toContain('여기까지 다 읽으셨어요.');
    expect(container.textContent).toContain(
      '읽은 맥락을 이어가거나, 관련 화두를 다시 살펴볼 수 있어요.',
    );
    expect(testState.triggerReadCelebration).not.toHaveBeenCalled();
    expect(testState.showToast).not.toHaveBeenCalled();
  });
});
