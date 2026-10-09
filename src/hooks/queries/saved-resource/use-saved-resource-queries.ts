'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getSavedResources,
  setSavedResource,
} from '@/api/endpoints/saved-resource/saved-resource-api';
import type { SavedResourceType } from '@/types/saved-resource';

export const SAVED_RESOURCES_QUERY_KEY = ['saved-resources'] as const;

export const useSavedResourcesQuery = ({
  enabled = true,
  size = 20,
  types,
}: {
  enabled?: boolean;
  size?: number;
  types?: SavedResourceType[];
} = {}) =>
  useInfiniteQuery({
    queryKey: [...SAVED_RESOURCES_QUERY_KEY, { size, types }] as const,
    queryFn: ({ pageParam }) =>
      getSavedResources({
        cursor: pageParam ?? undefined,
        size,
        types,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 60_000,
  });

export const useSetSavedResourceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setSavedResource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SAVED_RESOURCES_QUERY_KEY,
      });
    },
  });
};
