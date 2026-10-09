import { getByRole, queryByRole } from '@testing-library/dom';
import { createRequire } from 'node:module';
import { act, createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  GuestHomeFeedBody,
  HomeFeedBody,
} from '@/components/retention/home-feed';
import type { CommunityPostFeedResponse } from '@/types/community/post';
import type {
  HomeFeed as HomeFeedData,
  PublicHomeFeed,
} from '@/types/retention/contracts';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => { window: Window & typeof globalThis };
};

vi.mock('next/image', () => ({
  default: ({ fill: _fill, ...props }: Record<string, unknown>) =>
    createElement('img', props),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));
vi.mock('@/components/auth/modals/login-modal', () => ({
  default: ({ openTrigger }: { openTrigger: ReactElement }) => openTrigger,
}));
vi.mock('@/components/common/cards/home-feed-card', () => ({
  formatHomeFeedTime: () => '방금 전',
  HomeFeedCommunityPostCard: ({
    data,
  }: {
    data: { href: string; title: string };
  }) => createElement('a', { href: data.href }, data.title),
  HomeFeedInsightCard: ({ data }: { data: { title: string } }) =>
    createElement('article', null, data.title),
}));
vi.mock('@/components/home/home-hero-banner', () => ({
  default: () => createElement('div', null, '배너'),
}));
vi.mock('@/hooks/common/use-intersection-observer', () => ({
  useIntersectionObserver: () => ({ current: null }),
}));
vi.mock('@/features/auth/model/use-auth', () => ({
  useAuthReady: () => ({ isAuthReady: true, isHydrated: true }),
}));
vi.mock('@/hooks/queries/retention/use-retention-queries', () => ({
  useHomeFeedQuery: vi.fn(),
  useUnifiedSearchQuery: vi.fn(),
}));

const createPost = (postId: number, title: string) => ({
  postId,
  revision: 1,
  board: '업무 자동화',
  title,
  excerpt: `${title}의 본문 요약`,
  previewImageUrl: null,
  previewImageAlt: null,
  author: {
    memberId: 7,
    name: '수연',
    profileImageUrl: null,
    role: null,
  },
  stats: { viewCount: 91, likeCount: 38, commentCount: 2 },
  viewer: { isAuthenticated: false, canEdit: false, canDelete: false },
  createdAt: '2026-08-20T09:00:00+09:00',
  updatedAt: '2026-08-20T09:00:00+09:00',
});

const postFeed: CommunityPostFeedResponse = {
  popularItems: [createPost(102, '가장 많이 도움된 글')],
  items: [
    createPost(101, '오늘 올라온 새 글'),
    createPost(103, '두 번째로 올라온 새 글'),
  ],
  page: 1,
  size: 5,
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
  totalPostCount: 2,
};

const publicFeed: PublicHomeFeed = {
  topInsights: [
    {
      id: 1,
      board: '첫 시작',
      title: '처음 만든 사람의 기록',
      excerpt: '첫 기록 요약',
      viewCount: 24,
    },
  ],
  activeRooms: [],
  newMembersWeek: { total: 0, byInterest: [] },
  hotQuestions: [],
};

const memberFeed: HomeFeedData = {
  userName: '수연',
  streak: {
    count: 2,
    todayCompleted: false,
    atRisk: false,
    nextMilestone: 3,
  },
  continueReading: null,
  myRooms: [],
  communityToday: null,
  newMembersWeek: { total: 0, byInterest: [] },
  discoveryFeed: {
    sort: 'NEW',
    items: [],
    nextCursor: null,
  },
};

function renderMarkup(element: ReactElement) {
  const markup = renderToStaticMarkup(element);
  return new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    url: 'http://localhost',
  }).window.document.body;
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

describe('public home feed design parity', () => {
  it('renders all guest-only blocks and omits member-only controls', () => {
    const body = renderMarkup(
      createElement(GuestHomeFeedBody, {
        postFeed,
        publicFeed,
        roomLimit: 3,
      }),
    );

    // 비회원 소개 영역(GuestIntroCard)은 회장 결정(2026-08-24)으로 제거됐다.
    // 가입 진입점은 헤더의 "카카오로 시작" 버튼(home-header-client.tsx)이
    // 별도로 담당하므로 여기서는 그 영역이 더 이상 없다는 것만 확인한다.
    expect(body.textContent).not.toContain('여기는 뭐 하는 곳인가요');
    expect(body.textContent).toContain('지금 뜨는 글');
    expect(body.textContent).toContain('새 글');
    expect(body.textContent).toContain('많이 도움된 글');
    expect(body.textContent).toContain('인사이트');
    expect(body.textContent).toContain('입장한 방');
    expect(body.textContent).toContain('0/3');
    expect(body.textContent).not.toContain('내 활동');
    expect(body.textContent).not.toContain('내 방 글만');
    expect(body.textContent).not.toContain('Top');
    expect(
      queryByRole(body, 'link', { name: '오늘 올라온 새 글' }),
    ).not.toBeNull();
    expect(body.textContent).toContain('두 번째로 올라온 새 글');
  });

  it('renders the approved empty state when the public post list has no rows', () => {
    const body = renderMarkup(
      createElement(GuestHomeFeedBody, {
        postFeed: {
          ...postFeed,
          items: [],
          popularItems: [],
          totalElements: 0,
          totalPages: 0,
          totalPostCount: 0,
        },
        publicFeed,
        roomLimit: 3,
      }),
    );

    expect(body.textContent).toContain('아직 올라온 글이 없어요');
    expect(body.textContent).toContain(
      '방에 정착하면 그 방 사람들의 글이 여기에 먼저 보여요.',
    );
    expect(queryByRole(body, 'link', { name: '방 둘러보기' })).not.toBeNull();
  });

  it('switches the guest list to the popular public feed', async () => {
    const { container, root } = await renderInDom(
      createElement(GuestHomeFeedBody, {
        postFeed,
        publicFeed,
        roomLimit: 3,
      }),
    );

    expect(container.textContent).toContain('오늘 올라온 새 글');
    const popularButton = getByRole(container, 'button', {
      name: '많이 도움된 글',
    });
    await act(async () => popularButton.click());
    expect(container.textContent).toContain('가장 많이 도움된 글');

    await act(async () => root.unmount());
  });

  it('preserves the member-only activity rail and Top filter', () => {
    const body = renderMarkup(
      createElement(HomeFeedBody, {
        feed: memberFeed,
        sort: 'NEW',
        onSortChange: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        onLoadMore: vi.fn(),
      }),
    );

    expect(body.textContent).toContain('내 활동');
    expect(body.textContent).toContain('Top');
    expect(body.textContent).not.toContain('여기는 뭐 하는 곳인가요');
    expect(body.textContent).not.toContain('입장한 방0/3');
  });
});
