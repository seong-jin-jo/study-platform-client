import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CommunityRoomSummary } from '@/types/community/room-hub';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string) => { window: Window & typeof globalThis };
};

const room = (overrides: Partial<CommunityRoomSummary>) => ({
  roomId: 1,
  cohortId: null,
  slug: 'automation',
  code: 'AUTO',
  name: '업무 자동화',
  description: '반복 업무를 하나씩 걷어내는 방이에요.',
  bannerUrl: '/community/rooms/custom-banner.jpg',
  axisTags: [],
  jobAxis: [],
  goalAxis: [],
  levelAxis: [],
  stats: { memberCount: 26, postCount7d: 8, commentCount7d: 4 },
  memberCount: 26,
  newPostsToday: 3,
  liveSignal: true,
  membership: { state: 'NONE' as const, canJoin: true },
  rules: [],
  revision: 1,
  ...overrides,
});

const rooms = [
  room({ roomId: 1, name: '업무 자동화', memberCount: 26, newPostsToday: 3 }),
  room({
    roomId: 2,
    name: '웹앱 수익화',
    memberCount: 31,
    newPostsToday: 2,
  }),
  room({
    roomId: 3,
    name: '디자이너의 바이브코딩',
    memberCount: 14,
    newPostsToday: 5,
  }),
];

vi.mock('next/image', () => ({
  default: ({
    alt = '',
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: Record<string, unknown>) => createElement('img', { ...props, alt }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/features/auth/model/use-auth', () => ({
  useAuthReady: () => ({ isAuthenticated: true }),
}));
vi.mock('@/hooks/queries/community/use-community-room-hub-query', () => ({
  useCommunityRoomHubQuery: () => ({
    data: {
      myRooms: [],
      exploreRooms: rooms,
      axes: {
        job: [{ code: 'DESIGNER', label: '디자이너' }],
        goal: [{ code: 'AUTOMATION', label: '자동화' }],
        level: [{ code: 'BEGINNER', label: '처음' }],
      },
      activeRoomCount: 0,
      activeRoomLimit: 3,
    },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/queries/community/use-community-room-posts-query', () => ({
  useMyRepQuery: () => ({
    data: { repBalance: 128, repEarnedTotal: 128, recentEarns: [] },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/components/auth/modals/login-modal', () => ({
  default: ({ openTrigger }: { openTrigger: React.ReactNode }) => openTrigger,
}));
vi.mock('@/components/community/modals/create-community-room-modal', () => ({
  default: () => createElement('button', { type: 'button' }, '방 만들기'),
}));
vi.mock('@/components/community/modals/join-community-room-modal', () => ({
  default: ({ trigger }: { trigger: React.ReactNode }) => trigger,
}));

import CommunityRoomHubPage from './community-room-hub-page';

const TestLoginModal = ({ openTrigger }: { openTrigger: React.ReactNode }) =>
  openTrigger;

describe('SPRINT7 V3 커뮤니티 허브', () => {
  it('승인 시안의 데스크톱 히어로, 태블릿 페이지 머리와 사진형 방 카드를 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(CommunityRoomHubPage, {
        LoginModalComponent: TestLoginModal,
      }),
    );

    expect(markup).toContain('data-testid="mobile-community-heading"');
    expect(markup).toContain('lg:min-h-3400');
    expect(markup).toContain('xl:min-h-3750');
    expect(markup).toContain('media="(max-width: 1023px)"');
    expect(markup).toContain('object-cover opacity-50 max-lg:hidden');
    expect(markup).toContain('/community/rooms/home-hero-v3.jpg');
    expect(markup).toContain('/community/rooms/custom-banner.jpg');
    expect(markup).toContain('h-1400');
    expect(markup).toContain('오늘 새 글 3');
    expect(markup).toContain('입장하기');
    expect(markup).not.toContain('h-1300');
    expect(markup).not.toContain('background-image');
    expect(markup).not.toContain('role="group"');
  });

  it('두 순위의 기준과 숫자를 다르게 표시한다', () => {
    const markup = renderToStaticMarkup(
      createElement(CommunityRoomHubPage, {
        LoginModalComponent: TestLoginModal,
      }),
    );
    const document = new JSDOM(markup).window.document;
    const activityRanking = document.querySelector(
      '[data-testid="community-room-ranking-activity"]',
    );
    const popularityRanking = document.querySelector(
      '[data-testid="community-room-ranking-popular"]',
    );
    const activityRows = activityRanking?.querySelectorAll('li');
    const popularityRows = popularityRanking?.querySelectorAll('li');

    expect(markup).toContain('뽑는 기준: 오늘 0시 이후 새 글 수');
    expect(markup).toContain('뽑는 기준: 정착한 멤버 수');
    expect(activityRows?.[0]?.textContent).toContain('디자이너의 바이브코딩');
    expect(activityRows?.[0]?.textContent).toContain('새 글5');
    expect(activityRows?.[1]?.textContent).toContain('업무 자동화');
    expect(popularityRows?.[0]?.textContent).toContain('웹앱 수익화');
    expect(popularityRows?.[0]?.textContent).toContain('멤버31');
    expect(popularityRows?.[1]?.textContent).toContain('업무 자동화');
  });

  it('AIT-M4-02 읽기 전용 앱에서는 미지원 공부방 상세 링크를 렌더하지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(CommunityRoomHubPage, { readOnly: true }),
    );
    const document = new JSDOM(markup).window.document;

    expect(
      document.querySelectorAll('a[href^="/community/rooms/"]'),
    ).toHaveLength(0);
    expect(markup).toContain('앱에서는 방 목록만 제공해요');
  });
});
