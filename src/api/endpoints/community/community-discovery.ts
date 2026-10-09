import { axiosInstanceV2 } from '@/api/client/axiosV2';
import type { CommunityRepContextResponse } from '@/types/api/community-discovery.types';

interface ApiResponse<T> {
  content: T;
}

export async function getMyCommunityContext(): Promise<CommunityRepContextResponse> {
  const { data } = await axiosInstanceV2.get<
    ApiResponse<CommunityRepContextResponse>
  >('/api/v1/community/rep/context', { params: { size: 10 } });
  return data.content;
}
