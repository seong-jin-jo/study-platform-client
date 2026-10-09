// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import SeoHydrationBoundary, {
  useSeoHydrationReady,
} from './seo-hydration-boundary';

const reactTestEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

function Interactive({ ready }: { ready: boolean }) {
  useSeoHydrationReady(ready);
  return createElement(
    'main',
    { 'data-testid': 'interactive' },
    '상호작용 본문',
  );
}

describe('SeoHydrationBoundary ready handshake', () => {
  beforeAll(() => {
    reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps the server summary visible until the interactive query resolves', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(SeoHydrationBoundary, {
          waitForInteractiveReady: true,
          serverSummary: createElement(
            'main',
            { 'data-testid': 'server-summary' },
            '서버 공개 요약',
          ),
          interactive: createElement(Interactive, { ready: false }),
        }),
      );
    });

    expect(
      container
        .querySelector('[data-testid="server-summary"]')
        ?.closest('[hidden]'),
    ).toBeNull();
    expect(
      container
        .querySelector('[data-testid="interactive"]')
        ?.closest('[hidden]'),
    ).not.toBeNull();

    await act(async () => {
      root.render(
        createElement(SeoHydrationBoundary, {
          waitForInteractiveReady: true,
          serverSummary: createElement(
            'main',
            { 'data-testid': 'server-summary' },
            '서버 공개 요약',
          ),
          interactive: createElement(Interactive, { ready: true }),
        }),
      );
    });

    expect(
      container
        .querySelector('[data-testid="server-summary"]')
        ?.closest('[hidden]'),
    ).not.toBeNull();
    expect(
      container
        .querySelector('[data-testid="interactive"]')
        ?.closest('[hidden]'),
    ).toBeNull();

    await act(async () => root.unmount());
  });
});
