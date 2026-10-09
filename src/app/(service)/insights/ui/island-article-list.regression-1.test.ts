import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const island = {
  islandId: 1,
  slug: 'dep',
  name: '배포·운영',
  bridgeRoomId: 8,
  bridgeRoomName: '배포·운영방',
  progress: { read: 0, total: 1, conquered: false, conqueredAt: null },
  explorerCount: 312,
  articles: [
    {
      documentId: 'dep-doc-1',
      slug: 'dep-article-1',
      title: '배포가 실제로 일어나는 순서',
      description: '코드가 사용자 화면까지 가는 길',
      coverUrl: null,
      level: 'BEGINNER' as const,
      unlockCost: 0,
      accessLevel: 'FREE' as const,
      required: true,
      state: 'NEXT' as const,
      socialProof: {
        viewCount: 312,
        helpfulCount: 24,
        explorerCount: 312,
        helpfulByMe: false,
      },
    },
  ],
};

vi.mock('next/image', () => ({
  default: ({
    alt = '',
    unoptimized: _unoptimized,
    fill: _fill,
    priority: _priority,
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
  useAuth: () => ({ isAuthenticated: false, isHydrated: true }),
}));
vi.mock('@/hooks/queries/community/use-community-room-hub-query', () => ({
  useCommunityRoomDetailQuery: () => ({
    data: { roomId: 8, name: '배포·운영방' },
    isPending: false,
    isError: false,
  }),
}));
vi.mock('@/hooks/queries/insights/use-insight-worldmap-query', () => ({
  useInsightMapQuery: () => ({
    data: { islands: [island], readingBudget: { balance: 5, dailyCap: 5 } },
    isPending: false,
    isError: false,
  }),
  useInsightIslandQuery: () => ({
    data: island,
    isPending: false,
    isError: false,
  }),
  useInsightUnlockMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/queries/insights/use-koan-query', () => ({
  useKoansQuery: () => ({ data: { items: [] }, isError: false }),
}));

import IslandArticleList from './island-article-list';

describe('QA-513 비회원 물길 안내 회귀', () => {
  it('QA-513 인증 hydration 뒤 비회원은 budget 응답이 있어도 로그인 안내를 본다', () => {
    const markup = renderToStaticMarkup(
      createElement(IslandArticleList, { slug: 'dep' }),
    );

    expect(markup).toContain('로그인하면 하루 다섯 물길이 생깁니다');
    expect(markup).not.toContain('오늘 물길 5개가 남아 있습니다');
  });
});
