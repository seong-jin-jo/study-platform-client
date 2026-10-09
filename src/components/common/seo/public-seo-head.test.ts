// @vitest-environment jsdom

import { act, createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import SeoHydrationBoundary from '@/features/seo/ui/seo-hydration-boundary';
import PublicSeoHead from './public-seo-head';

const reactTestEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

describe('PublicSeoHead', () => {
  beforeAll(() => {
    reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('keeps title, description and canonical after the body hydrates', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(
          Fragment,
          null,
          createElement(PublicSeoHead, {
            title: '화두 상세 | ZERO-ONE',
            description: '공개 화두 설명',
            canonical: 'https://www.zeroone.it.kr/insights/koans/7',
            ogType: 'article',
          }),
          createElement(SeoHydrationBoundary, {
            serverSummary: createElement('main', null, '서버 본문'),
            interactive: createElement('main', null, '상호작용 본문'),
          }),
        ),
      );
    });

    expect(container.textContent).toBe('상호작용 본문');
    expect(document.title).toBe('화두 상세 | ZERO-ONE');
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute('content'),
    ).toBe('공개 화두 설명');
    expect(
      document.head
        .querySelector('link[rel="canonical"]')
        ?.getAttribute('href'),
    ).toBe('https://www.zeroone.it.kr/insights/koans/7');

    await act(async () => root.unmount());
  });
});
