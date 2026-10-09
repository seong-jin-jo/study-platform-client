import { useQuery } from '@tanstack/react-query';
import { getPublicProfile } from '@/api/endpoints/community/public-profile';

export function usePublicProfileQuery(profileUuid?: string) {
  return useQuery({
    queryKey: ['public-profile', profileUuid],
    queryFn: () => getPublicProfile(profileUuid ?? ''),
    enabled: Boolean(profileUuid),
  });
}
