import {
  getAllByRole,
  getByRole,
  queryByRole,
  within,
} from '@testing-library/dom';
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

const savedResourcesQueryState = vi.hoisted(() => ({
  mode: 'many' as 'empty' | 'many',
  types: undefined as string[] | undefined,
}));
const savedResourceFixtures = vi.hoisted(() => [
  {
    resourceType: 'COMMUNITY_POST',
    resourceKey: '101',
    title: '주간보고 자동화 전 과정',
    preview: '업무 자동화 방에서 실제로 줄인 과정을 기록했어요.',
    destination: '/community/101',
    savedAt: '2026-08-13T09:00:00+09:00',
    resourceState: 'AVAILABLE',
    roomId: 7,
    roomName: '업무 자동화',
    roomAvatarUrl: 'https://cdn.zeroone.test/rooms/automation.jpg',
    roomMemberCount: 16,
    roomJoined: true,
    authorName: '수연',
    createdAt: '2026-08-13T08:00:00+09:00',
    helpfulCount: 38,
    commentCount: 2,
    viewCount: 91,
  },
  {
    resourceType: 'INSIGHT_ARTICLE',
    resourceKey: 'red-error-first-line',
    title: '빨간 글씨, 첫 줄만 읽으면 되는 이유',
    preview: '막힘을 읽는 순서를 한 단계씩 설명합니다.',
    destination: '/insights/red-error-first-line',
    savedAt: '2026-08-12T09:00:00+09:00',
    resourceState: 'AVAILABLE',
    coverUrl: 'https://cdn.zeroone.test/insights/red-error.jpg',
    categorySlug: 'troubleshooting',
    helpfulCount: 52,
    viewCount: 340,
  },
]);

function renderMarkup(element: ReactElement) {
  const markup = renderToStaticMarkup(element);
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    url: 'http://localhost',
  });
  return dom.window.document.body;
}

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
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: Record<string, unknown>) => createElement('img', props),
}));
vi.mock('@/features/auth/model/use-auth', () => ({
  useAuthReady: () => ({ isAuthenticated: true, isHydrated: true }),
}));
vi.mock('@/hooks/queries/saved-resource/use-saved-resource-queries', () => ({
  useSavedResourcesQuery: ({ types }: { types?: string[] } = {}) => {
    savedResourcesQueryState.types = types;
    const items =
      savedResourcesQueryState.mode === 'empty'
        ? []
        : types
          ? savedResourceFixtures.filter((item) =>
              types.includes(item.resourceType),
            )
          : savedResourceFixtures;

    return {
      data: { pages: [{ items }] },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isError: false,
      isFetchingNextPage: false,
      isPending: false,
      refetch: vi.fn(),
    };
  },
  useSetSavedResourceMutation: () => ({
    data: undefined,
    isPending: false,
    mutateAsync: vi.fn(),
    variables: undefined,
  }),
}));

import SavedResourcesPage from './saved-resources-page';

describe('SPRINT7 V3 저장함 빈 상태', () => {
  it('승인 시안의 0건 설명과 홈 이동 행동을 렌더한다', () => {
    savedResourcesQueryState.mode = 'empty';
    const body = renderMarkup(createElement(SavedResourcesPage));
    const heading = getByRole(body, 'heading', {
      level: 1,
      name: '저장한 글V3',
    });
    const emptyRegion = getByRole(body, 'region', {
      name: '저장한 글이 아직 없어요',
    });
    const homeLink = within(emptyRegion).getByRole('link', {
      name: '읽을 글 보러 가기',
    });

    expect(heading).toBeTruthy();
    expect(
      within(emptyRegion).getByRole('heading', {
        level: 2,
        name: '저장한 글이 아직 없어요',
      }),
    ).toBeTruthy();
    expect(homeLink.getAttribute('href')).toBe('/');
  });

  it('공부방과 인사이트 혼합 목록을 같은 카드 규격과 필수 저장 정보로 렌더한다', () => {
    savedResourcesQueryState.mode = 'many';
    const body = renderMarkup(createElement(SavedResourcesPage));
    const articles = getAllByRole(body, 'article');
    const communityCard = getByRole(body, 'article', {
      name: '저장한 공부방 글: 주간보고 자동화 전 과정',
    });
    const insightCard = getByRole(body, 'article', {
      name: '저장한 인사이트 글: 빨간 글씨, 첫 줄만 읽으면 되는 이유',
    });
    const roomGroup = within(communityCard).getByRole('group', {
      name: '출처 방',
    });
    const authorGroup = within(communityCard).getByRole('group', {
      name: '글쓴이 수연',
    });
    const reactionGroup = within(communityCard).getByRole('group', {
      name: '글 반응',
    });
    const filterGroup = getByRole(body, 'group', { name: '저장한 글 분류' });

    const assertSavedCardCore = (
      card: HTMLElement,
      resourceLabel: '공부방' | '인사이트',
      title: string,
      destination: string,
      savedAt: string,
      preview: string,
    ) => {
      expect(
        within(card).getByRole('status', {
          name: `분류 ${resourceLabel}`,
        }),
      ).toBeTruthy();
      const savedTimeGroup = within(card).getByRole('group', {
        name: '저장 시각',
      });
      expect(
        within(savedTimeGroup).getByRole('time').getAttribute('datetime'),
      ).toBe(savedAt);
      expect(
        within(card).getByRole('link', { name: title }).getAttribute('href'),
      ).toBe(destination);
      expect(
        within(card).getByRole('note', { name: '요약문' }).textContent,
      ).toBe(preview);
      expect(
        within(card)
          .getByRole('button', { name: '저장 취소' })
          .getAttribute('aria-pressed'),
      ).toBe('true');
    };

    expect(articles).toHaveLength(2);
    expect(communityCard.getAttribute('class')).toBe(
      insightCard.getAttribute('class'),
    );
    assertSavedCardCore(
      communityCard,
      '공부방',
      '주간보고 자동화 전 과정',
      '/community/101',
      '2026-08-13T09:00:00+09:00',
      '업무 자동화 방에서 실제로 줄인 과정을 기록했어요.',
    );
    assertSavedCardCore(
      insightCard,
      '인사이트',
      '빨간 글씨, 첫 줄만 읽으면 되는 이유',
      '/insights/red-error-first-line',
      '2026-08-12T09:00:00+09:00',
      '막힘을 읽는 순서를 한 단계씩 설명합니다.',
    );
    expect(authorGroup).toBeTruthy();
    expect(
      within(roomGroup)
        .getByRole('img', { name: '업무 자동화 방 아바타' })
        .getAttribute('src'),
    ).toBe('https://cdn.zeroone.test/rooms/automation.jpg');
    expect(
      within(roomGroup)
        .getByRole('link', { name: '업무 자동화' })
        .getAttribute('href'),
    ).toBe('/community/rooms/7');
    expect(
      within(reactionGroup)
        .getByRole('link', { name: '댓글 2' })
        .getAttribute('href'),
    ).toBe('/community/101');
    expect(
      within(roomGroup).getByRole('status', { name: '방 멤버 16명' }),
    ).toBeTruthy();
    expect(
      within(reactionGroup).getByRole('status', { name: '도움됨 38' }),
    ).toBeTruthy();
    expect(
      within(
        within(insightCard).getByRole('group', { name: '글 반응' }),
      ).getByRole('status', { name: '조회 340' }),
    ).toBeTruthy();
    expect(
      within(filterGroup)
        .getByRole('button', { name: '전체' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(queryByRole(body, 'button', { name: '정리하기' })).toBeNull();
  });

  it('공부방 분류 버튼을 쿼리 타입 필터에 연결한다', async () => {
    savedResourcesQueryState.mode = 'many';
    const { container, root } = await renderInDom(
      createElement(SavedResourcesPage),
    );
    const communityButton = getByRole(container, 'button', {
      name: '공부방',
    });

    await act(async () => communityButton.click());
    expect(savedResourcesQueryState.types).toEqual(['COMMUNITY_POST']);
    expect(
      getByRole(container, 'article', {
        name: '저장한 공부방 글: 주간보고 자동화 전 과정',
      }),
    ).toBeTruthy();
    expect(
      queryByRole(container, 'article', {
        name: '저장한 인사이트 글: 빨간 글씨, 첫 줄만 읽으면 되는 이유',
      }),
    ).toBeNull();
    await act(async () => root.unmount());
  });
});
