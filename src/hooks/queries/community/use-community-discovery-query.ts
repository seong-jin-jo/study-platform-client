import { useQuery } from '@tanstack/react-query';
import { getMyCommunityContext } from '@/api/endpoints/community/community-discovery';
import { useAuthReady } from '@/features/auth/model/use-auth';

export function useMyCommunityContextQuery() {
  const { isAuthReady } = useAuthReady();
  return useQuery({
    queryKey: ['community', 'context', 'me'],
    queryFn: getMyCommunityContext,
    enabled: isAuthReady,
  });
}
