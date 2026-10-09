// @vitest-environment jsdom

import { sendGTMEvent } from '@next/third-parties/google';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  helpfulByMe: false,
  mutationOutcome: 'success' as 'error' | 'success',
  showToast: vi.fn(),
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
    pressed,
  }: {
    children: ReactNode;
    onPressedChange: () => void;
    pressed: boolean;
  }) =>
    createElement(
      'button',
      { 'aria-pressed': pressed, onClick: onPressedChange },
      children,
    ),
}));

vi.mock('@/hooks/queries/insights/use-insight-worldmap-query', () => ({
  useInsightHelpfulMutation: () => ({
    isPending: false,
    mutate: (
      _variables: unknown,
      callbacks: { onError: () => void; onSuccess: () => void },
    ) =>
      callbacks[
        testState.mutationOutcome === 'success' ? 'onSuccess' : 'onError'
      ](),
  }),
  useInsightMapQuery: () => ({
    data: {
      islands: [
        {
          articles: [
            {
              documentId: 'document-1',
              socialProof: {
                explorerCount: 10,
                helpfulByMe: testState.helpfulByMe,
                helpfulCount: 3,
                viewCount: 20,
              },
              state: 'UNLOCKED',
            },
          ],
        },
      ],
    },
  }),
  useInsightProgressMutation: () => ({ mutate: vi.fn() }),
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

let container: HTMLDivElement;
let root: Root;
const testDocument = document;
const testWindow = window;

class IntersectionObserverStub {
  public disconnect = vi.fn();
  public observe = vi.fn();
}

beforeEach(async () => {
  vi.stubGlobal('document', testDocument);
  vi.stubGlobal('window', testWindow);
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
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
        memberId: 7,
      }),
    ),
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  testState.helpfulByMe = false;
  testState.mutationOutcome = 'success';
});

const clickHelpful = async () => {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.includes('도움됐어요'),
  );
  await act(async () => button?.click());
};

describe('helpful_click analytics', () => {
  it('sends add only after a successful helpful mutation', async () => {
    await clickHelpful();

    expect(sendGTMEvent).toHaveBeenCalledWith({
      event: 'helpful_click',
      article_slug: 'deploy-first',
      action: 'add',
    });
  });

  it('sends remove when the successful mutation clears helpful', async () => {
    testState.helpfulByMe = true;
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
          memberId: 7,
        }),
      ),
    );
    await clickHelpful();

    expect(sendGTMEvent).toHaveBeenCalledWith({
      event: 'helpful_click',
      article_slug: 'deploy-first',
      action: 'remove',
    });
  });

  it('does not send an event when the mutation fails', async () => {
    testState.mutationOutcome = 'error';
    await clickHelpful();

    expect(sendGTMEvent).not.toHaveBeenCalled();
  });
});
