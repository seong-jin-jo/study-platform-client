// @vitest-environment jsdom

import userEvent from '@testing-library/user-event';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KoanSummary } from '@/types/insights/koan';

const queryState = vi.hoisted(() => ({
  items: [] as KoanSummary[],
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));

vi.mock('@/hooks/queries/insights/use-koan-query', () => ({
  useKoansQuery: () => ({
    data: {
      items: queryState.items,
      page: 1,
      size: queryState.items.length,
      totalElements: queryState.items.length,
      totalPages: 1,
    },
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  }),
}));

import KoanList from './koan-list';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ container: HTMLDivElement; root: Root }> = [];
const testDocument = document;
const testWindow = window;

const koan = (koanId: number, answerCount: number): KoanSummary => ({
  koanId,
  answerCount,
  categoryName: '배포·운영',
  categorySlug: 'dep',
  publishedAt: `2026-07-${String(koanId).padStart(2, '0')}T00:00:00+09:00`,
  question: `화두 ${koanId}`,
  viewCount: 0,
});

async function mountKoanList() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push({ container, root });
  await act(async () => root.render(createElement(KoanList)));
  return container;
}

beforeEach(() => {
  vi.stubGlobal('document', testDocument);
  vi.stubGlobal('window', testWindow);
});

afterEach(async () => {
  for (const { container, root } of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  queryState.items = [];
});

describe('Sprint 8 지난 화두 상호작용', () => {
  it('1~2건에서는 정렬과 더 보기를 숨긴다', async () => {
    queryState.items = [koan(1, 1), koan(2, 2)];
    const container = await mountKoanList();

    expect(container.querySelector('[aria-label="지난 화두 정렬"]')).toBeNull();
    expect(container.textContent).not.toContain('개 더 보기');
  });

  it('10건씩 더 불러오고 클릭 메뉴에서 보완 많은 순을 선택한다', async () => {
    queryState.items = Array.from({ length: 21 }, (_, index) =>
      koan(index + 1, 21 - index),
    );
    const container = await mountKoanList();
    const user = userEvent.setup();

    expect(
      container.querySelectorAll('a[href^="/insights/koans/"]'),
    ).toHaveLength(10);
    const loadMore = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === '11개 더 보기',
    );
    expect(loadMore).toBeDefined();
    await act(async () => user.click(loadMore as HTMLButtonElement));
    expect(
      container.querySelectorAll('a[href^="/insights/koans/"]'),
    ).toHaveLength(20);

    const sortTrigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="지난 화두 정렬"]',
    );
    expect(sortTrigger?.getAttribute('aria-expanded')).toBe('false');
    await act(async () => user.click(sortTrigger as HTMLButtonElement));
    expect(sortTrigger?.getAttribute('aria-expanded')).toBe('true');
    const answersFirst = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
    ).find((item) => item.textContent?.includes('보완이 많은 순'));
    expect(answersFirst).toBeDefined();
    await act(async () => user.click(answersFirst as HTMLElement));

    expect(
      container
        .querySelector<HTMLAnchorElement>('a[href^="/insights/koans/"]')
        ?.getAttribute('href'),
    ).toBe('/insights/koans/1');
    expect(
      container.querySelectorAll('a[href^="/insights/koans/"]'),
    ).toHaveLength(10);
  });
});
