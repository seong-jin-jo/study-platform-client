// @vitest-environment jsdom

import { sendGTMEvent } from '@next/third-parties/google';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArticleViewTracker,
  IslandEnterTracker,
} from './insight-core-event-trackers';

vi.mock('@next/third-parties/google', () => ({
  sendGTMEvent: vi.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const testDocument = document;
const testWindow = window;

beforeEach(() => {
  vi.stubGlobal('document', testDocument);
  vi.stubGlobal('window', testWindow);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const render = async (element: ReactElement) => {
  await act(async () => root.render(element));
};

describe('insight core event trackers', () => {
  it('sends island_enter once for the same island across rerenders', async () => {
    await render(
      createElement(IslandEnterTracker, {
        islandName: '배포의 섬',
        islandSlug: 'deployment',
      }),
    );
    await render(
      createElement(IslandEnterTracker, {
        islandName: '배포의 섬 새 이름',
        islandSlug: 'deployment',
      }),
    );

    expect(sendGTMEvent).toHaveBeenCalledOnce();
    expect(sendGTMEvent).toHaveBeenCalledWith({
      event: 'island_enter',
      island_slug: 'deployment',
      island_name: '배포의 섬',
    });
  });

  it('sends article_view once per article access state', async () => {
    await render(
      createElement(ArticleViewTracker, {
        accessState: 'LOCKED',
        articleSlug: 'deploy-first',
        islandSlug: 'deployment',
      }),
    );
    await render(
      createElement(ArticleViewTracker, {
        accessState: 'LOCKED',
        articleSlug: 'deploy-first',
        islandSlug: 'deployment',
      }),
    );
    await render(
      createElement(ArticleViewTracker, {
        accessState: 'UNLOCKED',
        articleSlug: 'deploy-first',
        islandSlug: 'deployment',
      }),
    );

    expect(sendGTMEvent).toHaveBeenCalledTimes(2);
    expect(sendGTMEvent).toHaveBeenNthCalledWith(1, {
      event: 'article_view',
      article_slug: 'deploy-first',
      island_slug: 'deployment',
      access_state: 'LOCKED',
    });
    expect(sendGTMEvent).toHaveBeenNthCalledWith(2, {
      event: 'article_view',
      article_slug: 'deploy-first',
      island_slug: 'deployment',
      access_state: 'UNLOCKED',
    });
  });
});
