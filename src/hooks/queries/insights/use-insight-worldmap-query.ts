import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getInsightIsland,
  getInsightMap,
  markInsightRead,
  recordInsightView,
  setInsightHelpful,
  unlockInsightArticle,
} from '@/api/endpoints/insights/insight-worldmap-api';

export const insightMapKeys = {
  all: ['insight-worldmap'] as const,
  map: () => [...insightMapKeys.all, 'map'] as const,
  island: (id: number) => [...insightMapKeys.all, 'island', id] as const,
};
export function useInsightMapQuery() {
  return useQuery({
    queryKey: insightMapKeys.map(),
    queryFn: getInsightMap,
    retry: false,
  });
}
export function useInsightIslandQuery(islandId: number | null) {
  return useQuery({
    queryKey: insightMapKeys.island(islandId ?? 0),
    queryFn: () => getInsightIsland(islandId as number),
    enabled: islandId !== null,
  });
}
export function useInsightProgressMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: markInsightRead,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: insightMapKeys.all });
    },
  });
}
export function useInsightHelpfulMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      helpful,
    }: {
      documentId: string;
      helpful: boolean;
    }) => setInsightHelpful(documentId, helpful),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: insightMapKeys.all });
    },
  });
}
export function useInsightUnlockMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: unlockInsightArticle,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: insightMapKeys.all });
    },
  });
}
export function useInsightViewMutation() {
  return useMutation({ mutationFn: recordInsightView });
}
