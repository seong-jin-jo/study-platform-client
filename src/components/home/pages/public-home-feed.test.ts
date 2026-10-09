import { getByRole } from '@testing-library/dom';
import { createRequire } from 'node:module';
import { act, createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => { window: Window & typeof globalThis };
};

const queryState = vi.hoisted(() => ({
  posts: {} as Record<string, unknown>,
  rooms: {} as Record<string, unknown>,
  publicFeed: {} as Record<string, unknown>,
}));

vi.mock('@/hooks/queries/community/use-community-room-posts-query', () => ({
  usePublicCommunityPostsQuery: () => queryState.posts,
}));
vi.mock('@/hooks/queries/community/use-community-room-hub-query', () => ({
  useCommunityRoomHubQuery: () => queryState.rooms,
}));
vi.mock('@/hooks/queries/retention/use-retention-queries', () => ({
  usePublicHomeFeedQuery: () => queryState.publicFeed,
}));
vi.mock('@/components/retention/home-feed', () => ({
  GuestHomeFeedBody: ({ roomLimit }: { roomLimit: number }) =>
    createElement('div', null, `guest-ready-${roomLimit}`),
  HomeFeedLoading: () => createElement('div', null, 'guest-loading'),
  HomeFeedUnavailable: ({ onRetry }: { onRetry: () => void }) =>
    createElement('button', { type: 'button', onClick: onRetry }, '다시 시도'),
}));

import PublicHomeFeed from './public-home-feed';

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

describe('public home query integration', () => {
  beforeEach(() => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    queryState.posts = {
      data: { items: [], popularItems: [] },
      isError: false,
      isLoading: false,
      refetch,
    };
    queryState.rooms = {
      data: { activeRoomLimit: 3 },
      isError: false,
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };
    queryState.publicFeed = {
      data: { topInsights: [] },
      isError: false,
      isLoading: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('waits for all three public endpoints before rendering the feed', () => {
    queryState.rooms.isLoading = true;

    expect(renderToStaticMarkup(createElement(PublicHomeFeed))).toContain(
      'guest-loading',
    );

    queryState.rooms.isLoading = false;
    expect(renderToStaticMarkup(createElement(PublicHomeFeed))).toContain(
      'guest-ready-3',
    );
  });

  it('retries posts, rooms, and public-feed together from the error action', async () => {
    queryState.posts.isError = true;
    const { container, root } = await renderInDom(
      createElement(PublicHomeFeed),
    );

    await act(async () =>
      getByRole(container, 'button', { name: '다시 시도' }).click(),
    );

    expect(queryState.posts.refetch).toHaveBeenCalledOnce();
    expect(queryState.rooms.refetch).toHaveBeenCalledOnce();
    expect(queryState.publicFeed.refetch).toHaveBeenCalledOnce();

    await act(async () => root.unmount());
  });
});
