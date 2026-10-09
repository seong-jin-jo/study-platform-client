import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UnifiedSearchResponse } from '@/types/api/search.types';
import type { HomeFeed } from '@/types/retention/contracts';

const getHomeFeed = vi.fn();
const searchHomeContent = vi.fn();
const useInfiniteQuery = vi.fn((options) => options);

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery,
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@/api/endpoints/retention/retention-api', () => ({
  getHomeFeed,
  getInsightReadingBudget: vi.fn(),
  getMyCohorts: vi.fn(),
  getMyStreak: vi.fn(),
  getPublicHomeFeed: vi.fn(),
  searchHomeContent,
  submitRetentionOnboarding: vi.fn(),
  unlockInsightArticle: vi.fn(),
}));

const createHomePage = (id: number, nextCursor: string | null): HomeFeed => ({
  userName: '테스트 멤버',
  streak: {
    count: 1,
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
    items: [
      {
        type: 'COMMUNITY_POST',
        id: `post:${id}`,
        roomId: 1,
        title: `글 ${id}`,
        excerpt: `본문 ${id}`,
        stats: { viewCount: id, commentCount: id, helpfulCount: id },
      },
    ],
    nextCursor,
  },
});

describe('리텐션 무한 목록 쿼리', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('홈 피드의 nextCursor를 다음 요청에 전달하고 두 페이지를 합친다', async () => {
    const { useHomeFeedQuery } = await import('./use-retention-queries');
    const options = useHomeFeedQuery(true, 'NEW') as unknown as {
      queryFn: (context: { pageParam: string | null }) => Promise<HomeFeed>;
      getNextPageParam: (page: HomeFeed) => string | null;
      select: (result: {
        pages: HomeFeed[];
        pageParams: Array<string | null>;
      }) => HomeFeed;
    };
    const firstPage = createHomePage(1, 'page-2');
    const secondPage = createHomePage(2, null);
    getHomeFeed
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    await options.queryFn({ pageParam: null });
    expect(options.getNextPageParam(firstPage)).toBe('page-2');
    await options.queryFn({ pageParam: 'page-2' });

    expect(getHomeFeed).toHaveBeenNthCalledWith(1, {
      sort: 'NEW',
      cursor: undefined,
    });
    expect(getHomeFeed).toHaveBeenNthCalledWith(2, {
      sort: 'NEW',
      cursor: 'page-2',
    });
    expect(
      options
        .select({
          pages: [firstPage, secondPage],
          pageParams: [null, 'page-2'],
        })
        .discoveryFeed.items.map((item) => item.id),
    ).toEqual(['post:1', 'post:2']);
  });

  it('통합검색의 커뮤니티와 인사이트 결과를 페이지 순서대로 합친다', async () => {
    const { useUnifiedSearchQuery } = await import('./use-retention-queries');
    const options = useUnifiedSearchQuery('배포') as unknown as {
      queryFn: (context: {
        pageParam: string | null;
      }) => Promise<UnifiedSearchResponse>;
      select: (result: {
        pages: UnifiedSearchResponse[];
        pageParams: Array<string | null>;
      }) => Pick<
        UnifiedSearchResponse,
        'items' | 'partial' | 'unavailableSources'
      >;
    };
    const firstPage: UnifiedSearchResponse = {
      items: [
        {
          type: 'COMMUNITY_POST',
          resourceKey: 'post:1',
          title: '커뮤니티 결과',
          previewText: '본문',
          access: 'FULL',
          destination: '/community/1',
          publishedAt: '2026-08-06T00:00:00Z',
        },
      ],
      nextCursor: 'search-2',
      partial: false,
      unavailableSources: [],
    };
    const secondPage: UnifiedSearchResponse = {
      items: [
        {
          type: 'INSIGHT_ARTICLE',
          resourceKey: 'insight:1',
          title: '인사이트 결과',
          previewText: '본문',
          access: 'FULL',
          destination: '/insight-articles/1',
          publishedAt: '2026-08-05T00:00:00Z',
        },
      ],
      nextCursor: null,
      partial: true,
      unavailableSources: ['COMMUNITY'],
    };
    searchHomeContent
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    await options.queryFn({ pageParam: null });
    await options.queryFn({ pageParam: 'search-2' });
    const selected = options.select({
      pages: [firstPage, secondPage],
      pageParams: [null, 'search-2'],
    });

    expect(searchHomeContent).toHaveBeenNthCalledWith(2, {
      query: '배포',
      cursor: 'search-2',
    });
    expect(selected.items.map((item) => item.type)).toEqual([
      'COMMUNITY_POST',
      'INSIGHT_ARTICLE',
    ]);
    expect(selected.partial).toBe(true);
    expect(selected.unavailableSources).toEqual(['COMMUNITY']);
  });
});
