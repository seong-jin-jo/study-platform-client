import { createRequire } from 'node:module';
import { act, createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => { window: Window & typeof globalThis };
};

const notificationQueryState = vi.hoisted(() => ({
  mode: 'empty' as 'empty' | 'error',
  refetch: vi.fn(),
}));

async function renderInDom(element: ReactElement) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost',
  });

  vi.stubGlobal('window', dom.window);
  vi.stubGlobal('document', dom.window.document);
  vi.stubGlobal('navigator', dom.window.navigator);
  vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
  vi.stubGlobal('Element', dom.window.Element);
  vi.stubGlobal('Node', dom.window.Node);
  vi.stubGlobal('Event', dom.window.Event);
  vi.stubGlobal('MouseEvent', dom.window.MouseEvent);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

  const container = dom.window.document.createElement('div');
  dom.window.document.body.append(container);
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);

  await act(async () => root.render(element));
  return { container, root };
}

vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('public/images/notification.svg', () => ({
  default: () => createElement('svg', { 'aria-hidden': true }),
}));
vi.mock('@/components/common/ui/dropdown/single', () => ({
  default: ({ placeholder }: { placeholder: string }) =>
    createElement('button', null, placeholder),
}));
vi.mock('@/components/common/ui/pagination', () => ({
  default: () => createElement('nav', null, '페이지 이동'),
}));
vi.mock('@/hooks/queries/user/notification-queries', () => ({
  useGetNotifications: () => ({
    data: { content: [], totalPages: 0 },
    isError: notificationQueryState.mode === 'error',
    isLoading: false,
    refetch: notificationQueryState.refetch,
  }),
  useGetNotificationCategories: () => ({
    data: { notificationCategories: [] },
  }),
  useReadNotifications: () => ({ mutate: vi.fn() }),
}));

import NotificationPage from './page-client';

describe('SPRINT7 V3 알림 빈 상태', () => {
  it('0건 안내와 실제 설정 경로를 렌더하고 불필요한 쪽 넘기기를 감춘다', () => {
    notificationQueryState.mode = 'empty';
    const markup = renderToStaticMarkup(createElement(NotificationPage));

    expect(markup).toContain('아직 온 알림이 없어요');
    expect(markup).toContain('내 글에 답이 달리거나 방에 새 글이 올라오면');
    expect(markup).toContain('href="/notification/settings"');
    expect(markup).not.toContain('페이지 이동');
    expect(markup).toContain('disabled=""');
  });

  it('API 실패를 빈 상태보다 먼저 오류와 재시도 행동으로 렌더한다', () => {
    notificationQueryState.mode = 'error';
    const markup = renderToStaticMarkup(createElement(NotificationPage));

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('알림을 못 불러왔어요');
    expect(markup).toContain('다시 시도');
    expect(markup).not.toContain('아직 온 알림이 없어요');
  });

  it('오류 상태의 다시 시도를 실제 쿼리 재호출에 연결한다', async () => {
    notificationQueryState.mode = 'error';
    const { container, root } = await renderInDom(
      createElement(NotificationPage),
    );
    const retryButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('다시 시도'),
    );

    expect(retryButton).toBeTruthy();
    await act(async () => retryButton?.click());
    expect(notificationQueryState.refetch).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
  });
});
