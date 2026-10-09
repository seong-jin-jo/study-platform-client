'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCommunityRoom,
  claimCommunityRoomOwnership,
  getCommunityRoom,
  getCommunityRoomHub,
  joinCommunityRoom,
  leaveCommunityRoom,
} from '@/api/endpoints/community/community-room-hub';
import type {
  CommunityRoomHubFilters,
  CreateCommunityRoomRequest,
} from '@/types/community/room-hub';

const COMMUNITY_ROOM_HUB_STALE_TIME = 60_000;
export const COMMUNITY_ROOM_HUB_QUERY_KEY = ['community-room-hub'] as const;
export const COMMUNITY_ROOM_DETAIL_QUERY_KEY = [
  'community-room-detail',
] as const;

export const useCommunityRoomHubQuery = (
  filters: CommunityRoomHubFilters,
  enabled = true,
) =>
  useQuery({
    queryKey: [...COMMUNITY_ROOM_HUB_QUERY_KEY, filters] as const,
    queryFn: () => getCommunityRoomHub(filters),
    staleTime: COMMUNITY_ROOM_HUB_STALE_TIME,
    enabled,
  });

export const useCommunityRoomDetailQuery = (roomId: number) =>
  useQuery({
    queryKey: [...COMMUNITY_ROOM_DETAIL_QUERY_KEY, roomId] as const,
    queryFn: () => getCommunityRoom(roomId),
    enabled: roomId > 0,
    staleTime: COMMUNITY_ROOM_HUB_STALE_TIME,
  });

const useInvalidateCommunityRooms = () => {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: COMMUNITY_ROOM_HUB_QUERY_KEY,
      }),
      queryClient.invalidateQueries({
        queryKey: COMMUNITY_ROOM_DETAIL_QUERY_KEY,
      }),
    ]);
  };
};

export const useJoinCommunityRoomMutation = () => {
  const invalidateRooms = useInvalidateCommunityRooms();

  return useMutation({
    mutationFn: joinCommunityRoom,
    onSuccess: invalidateRooms,
  });
};

export const useLeaveCommunityRoomMutation = () => {
  const invalidateRooms = useInvalidateCommunityRooms();

  return useMutation({
    mutationFn: leaveCommunityRoom,
    onSuccess: invalidateRooms,
  });
};

export const useClaimCommunityRoomOwnershipMutation = () => {
  const invalidateRooms = useInvalidateCommunityRooms();

  return useMutation({
    mutationFn: claimCommunityRoomOwnership,
    onSuccess: invalidateRooms,
  });
};

export const useCreateCommunityRoomMutation = () => {
  const invalidateRooms = useInvalidateCommunityRooms();

  return useMutation({
    mutationFn: (request: CreateCommunityRoomRequest) =>
      createCommunityRoom(request),
    onSuccess: invalidateRooms,
  });
};
