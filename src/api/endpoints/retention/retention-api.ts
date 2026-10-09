import { axiosInstance, axiosInstanceV6 } from '@/api/client/axios';
import type { UnifiedSearchResponse } from '@/types/api/search.types';
import type {
  BaseResponse,
  Cohort,
  HomeFeed,
  HomeDiscoverySort,
  InsightArticleUnlock,
  InsightReadingBudget,
  PublicHomeFeed,
  RetentionOnboardingRequest,
  RetentionOnboardingResponse,
  StreakStatus,
} from '@/types/retention/contracts';

export async function submitRetentionOnboarding(
  request: RetentionOnboardingRequest,
) {
  const { data } = await axiosInstanceV6.post<
    BaseResponse<RetentionOnboardingResponse>
  >('class-onboarding/me/step-4', request);
  return data.content;
}

export async function getMyStreak() {
  const { data } =
    await axiosInstance.get<BaseResponse<StreakStatus>>('streak/me');
  return data.content;
}

export async function getMyCohorts() {
  const { data } =
    await axiosInstance.get<BaseResponse<{ cohorts: Cohort[] }>>('cohorts/me');
  return data.content.cohorts;
}

export async function getHomeFeed({
  sort = 'HOT',
  cursor,
  size = 20,
}: {
  sort?: HomeDiscoverySort;
  cursor?: string;
  size?: number;
} = {}) {
  const { data } = await axiosInstance.get<BaseResponse<HomeFeed>>(
    'home/feed',
    {
      params: {
        sort,
        size,
        ...(cursor ? { cursor } : {}),
      },
    },
  );
  return data.content;
}

export async function getPublicHomeFeed() {
  const { data } =
    await axiosInstance.get<BaseResponse<PublicHomeFeed>>('home/public-feed');
  return data.content;
}

export async function searchHomeContent({
  query,
  cursor,
  size = 20,
}: {
  query: string;
  cursor?: string;
  size?: number;
}) {
  const { data } = await axiosInstance.get<BaseResponse<UnifiedSearchResponse>>(
    'search',
    {
      params: {
        q: query,
        size,
        ...(cursor ? { cursor } : {}),
      },
    },
  );
  return data.content;
}

export async function getInsightReadingBudget() {
  const { data } = await axiosInstance.get<BaseResponse<InsightReadingBudget>>(
    'insight/reading-budget/me',
  );
  return data.content;
}

export async function unlockInsightArticle(articleId: string) {
  const { data } = await axiosInstance.post<BaseResponse<InsightArticleUnlock>>(
    `insight/articles/${encodeURIComponent(articleId)}/unlock`,
  );
  return data.content;
}
