import { axiosInstanceV2 } from '@/api/client/axiosV2';
import type { PublicProfileResponse } from '@/types/api/public-profile.types';

interface ApiResponse<T> {
  content: T;
}

export async function getPublicProfile(
  profileUuid: string,
): Promise<PublicProfileResponse> {
  const { data } = await axiosInstanceV2.get<
    ApiResponse<PublicProfileResponse>
  >(`/api/v1/members/${encodeURIComponent(profileUuid)}/public-profile`, {
    params: { listSize: 5 },
  });
  return data.content;
}
