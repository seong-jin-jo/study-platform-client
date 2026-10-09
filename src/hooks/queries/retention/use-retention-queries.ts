import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getInsightReadingBudget,
  getHomeFeed,
  getPublicHomeFeed,
  getMyCohorts,
  getMyStreak,
  searchHomeContent,
  submitRetentionOnboarding,
  unlockInsightArticle,
} from '@/api/endpoints/retention/retention-api';
import type {
  HomeDiscoverySort,
  RetentionOnboardingRequest,
} from '@/types/retention/contracts';

export const useHomeFeedQuery = (
  enabled = true,
  sort: HomeDiscoverySort = 'NEW',
) =>
  useInfiniteQuery({
    queryKey: ['retention', 'home-feed', sort],
    queryFn: ({ pageParam }) =>
      getHomeFeed({ sort, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.discoveryFeed.nextCursor,
    enabled,
    select: (result) => {
      const firstPage = result.pages[0];
      const lastPage = result.pages.at(-1);

      if (!firstPage || !lastPage) {
        return undefined;
      }

      return {
        ...firstPage,
        discoveryFeed: {
          ...firstPage.discoveryFeed,
          items: result.pages.flatMap((page) => page.discoveryFeed.items),
          nextCursor: lastPage.discoveryFeed.nextCursor,
        },
      };
    },
  });

export const useUnifiedSearchQuery = (query: string, enabled = true) =>
  useInfiniteQuery({
    queryKey: ['retention', 'unified-search', query],
    queryFn: ({ pageParam }) =>
      searchHomeContent({ query, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && query.trim().length >= 2,
    retry: false,
    select: (result) => ({
      items: result.pages.flatMap((page) => page.items),
      partial: result.pages.some((page) => page.partial),
      unavailableSources: [
        ...new Set(result.pages.flatMap((page) => page.unavailableSources)),
      ],
    }),
  });

export const usePublicHomeFeedQuery = () =>
  useQuery({
    queryKey: ['retention', 'public-home-feed'],
    queryFn: getPublicHomeFeed,
    retry: false,
  });

export const useStreakQuery = () =>
  useQuery({ queryKey: ['retention', 'streak'], queryFn: getMyStreak });

export const useMyCohortsQuery = () =>
  useQuery({ queryKey: ['retention', 'cohorts'], queryFn: getMyCohorts });

export const useInsightReadingBudgetQuery = () =>
  useQuery({
    queryKey: ['insight', 'reading-budget', 'me'],
    queryFn: getInsightReadingBudget,
    retry: false,
  });

export const useUnlockInsightArticleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unlockInsightArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['insight', 'reading-budget', 'me'],
      });
    },
  });
};

export const useRetentionOnboardingMutation = () =>
  useMutation({
    mutationFn: (request: RetentionOnboardingRequest) =>
      submitRetentionOnboarding(request),
  });
