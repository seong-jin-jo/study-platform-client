'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCommunityPosts,
  getCommunityRoomPosts,
  getMyRep,
  searchCommunityRoomPosts,
  setCommunityPostHelpful,
} from '@/api/endpoints/community/community-room-posts';
import { useAuthReady } from '@/features/auth/model/use-auth';
import type { CommunityPostCollection } from '@/hooks/queries/community/community-post-cache';
import {
  COMMUNITY_ROOM_POSTS_KEY,
  MY_COMMUNITY_REP_QUERY_KEY,
  updateCommunityPostCollection,
} from '@/hooks/queries/community/community-post-cache';
import type { CommunityPostSort } from '@/types/community/post';

const MY_REP_STALE_TIME = 60_000;
export const PUBLIC_COMMUNITY_POSTS_QUERY_KEY = [
  'community-posts',
  'public-home',
] as const;

export const usePublicCommunityPostsQuery = (enabled = true) =>
  useQuery({
    queryKey: PUBLIC_COMMUNITY_POSTS_QUERY_KEY,
    queryFn: () => getCommunityPosts({ page: 1, size: 5 }),
    enabled,
    retry: false,
  });

export const communityRoomPostsQueryKey = (roomId: number) =>
  [...COMMUNITY_ROOM_POSTS_KEY, roomId] as const;

export const useCommunityRoomPostsQuery = (roomId: number, enabled: boolean) =>
  useQuery({
    queryKey: communityRoomPostsQueryKey(roomId),
    queryFn: () => getCommunityRoomPosts(roomId),
    enabled,
  });

export const useCommunityRoomPostSearchQuery = (
  roomId: number,
  query: string,
  sort: CommunityPostSort,
  enabled: boolean,
) => {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: [
      ...communityRoomPostsQueryKey(roomId),
      'search',
      normalizedQuery,
      sort,
    ],
    queryFn: () =>
      searchCommunityRoomPosts({ roomId, q: normalizedQuery, sort }),
    enabled: enabled && normalizedQuery.length > 0,
  });
};

export const useMyRepQuery = () => {
  const { isAuthReady } = useAuthReady();

  return useQuery({
    queryKey: MY_COMMUNITY_REP_QUERY_KEY,
    queryFn: getMyRep,
    enabled: isAuthReady,
    staleTime: MY_REP_STALE_TIME,
  });
};

export const useToggleCommunityPostHelpfulMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setCommunityPostHelpful,
    onMutate: async ({ postId, helpful }) => {
      await queryClient.cancelQueries({ queryKey: COMMUNITY_ROOM_POSTS_KEY });
      const previousData = queryClient.getQueriesData<CommunityPostCollection>({
        queryKey: COMMUNITY_ROOM_POSTS_KEY,
      });

      queryClient.setQueriesData<CommunityPostCollection>(
        { queryKey: COMMUNITY_ROOM_POSTS_KEY },
        (current) => {
          if (!current || !('items' in current)) return current;
          const target = current.items.find((post) => post.postId === postId);
          if (!target) return current;

          return updateCommunityPostCollection(
            current,
            postId,
            Math.max(0, target.stats.likeCount + (helpful ? 1 : -1)),
          );
        },
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      context?.previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (response, variables) => {
      queryClient.setQueriesData<CommunityPostCollection>(
        { queryKey: COMMUNITY_ROOM_POSTS_KEY },
        (current) =>
          current
            ? updateCommunityPostCollection(
                current,
                variables.postId,
                response.likeCount,
              )
            : current,
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: COMMUNITY_ROOM_POSTS_KEY }),
  });
};
