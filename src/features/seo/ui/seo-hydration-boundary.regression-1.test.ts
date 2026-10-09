// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import SeoHydrationBoundary, {
  useSeoHydrationReady,
} from './seo-hydration-boundary';

const reactTestEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

function Interactive({ ready }: { ready: boolean }) {
  useSeoHydrationReady(ready);
  return createElement('h2', null, '이 방의 이야기');
}

describe('QA-514 SEO hydration 중복 DOM 회귀', () => {
  beforeAll(() => {
    reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it('QA-514 준비 완료 뒤 서버 요약을 제거해 같은 헤딩을 하나만 남긴다', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(SeoHydrationBoundary, {
          waitForInteractiveReady: true,
          serverSummary: createElement('h2', null, '이 방의 이야기'),
          interactive: createElement(Interactive, { ready: true }),
        }),
      );
    });

    expect(container.querySelectorAll('h2')).toHaveLength(1);
    expect(container.textContent).toBe('이 방의 이야기');
    expect(container.querySelector('.hidden')).toBeNull();

    await act(async () => root.unmount());
  });
});
