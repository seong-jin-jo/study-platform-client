import { axiosInstance, axiosInstanceForMultipart } from '@/api/client/axios';
import type {
  CommunityRoomBannerUploadTicket,
  CommunityRoomHubFilters,
  CommunityRoomHubResponse,
  CommunityRoomMembershipResponse,
  CommunityRoomOwnershipClaimResponse,
  CommunityRoomSummary,
  CreateCommunityRoomRequest,
  CreateCommunityRoomResponse,
  JoinCommunityRoomRequest,
} from '@/types/community/room-hub';

interface ApiResponse<T> {
  content: T;
}

const matchesFilters = (
  room: CommunityRoomSummary,
  filters: CommunityRoomHubFilters,
) =>
  (!filters.job || room.jobAxis.some((tag) => tag.code === filters.job)) &&
  (!filters.goal || room.goalAxis.some((tag) => tag.code === filters.goal)) &&
  (!filters.level || room.levelAxis.some((tag) => tag.code === filters.level));

export const getCommunityRoomHub = async (filters: CommunityRoomHubFilters) => {
  const response =
    await axiosInstance.get<ApiResponse<CommunityRoomHubResponse>>(
      '/community/rooms',
    );
  const hub = response.data.content;

  return {
    ...hub,
    myRooms: hub.myRooms.filter((room) => matchesFilters(room, filters)),
    exploreRooms: hub.exploreRooms.filter((room) =>
      matchesFilters(room, filters),
    ),
  };
};

export const getCommunityRoom = async (roomId: number) => {
  const response = await axiosInstance.get<ApiResponse<CommunityRoomSummary>>(
    `/community/rooms/${roomId}`,
  );

  return response.data.content;
};

export const createCommunityRoom = async (
  request: CreateCommunityRoomRequest,
) => {
  const response = await axiosInstance.post<
    ApiResponse<CreateCommunityRoomResponse>
  >('/community/rooms', request);

  return response.data.content;
};

export const joinCommunityRoom = async ({
  roomId,
  ...request
}: JoinCommunityRoomRequest) => {
  const response = await axiosInstance.post<
    ApiResponse<CommunityRoomMembershipResponse>
  >(`/community/rooms/${roomId}/join`, request);

  return response.data.content;
};

export const leaveCommunityRoom = async (roomId: number) => {
  const response = await axiosInstance.delete<
    ApiResponse<CommunityRoomMembershipResponse>
  >(`/community/rooms/${roomId}/join`);

  return response.data.content;
};

export const claimCommunityRoomOwnership = async ({
  expectedRevision,
  roomId,
}: {
  expectedRevision: number;
  roomId: number;
}) => {
  const response = await axiosInstance.post<
    ApiResponse<CommunityRoomOwnershipClaimResponse>
  >(`/community/rooms/${roomId}/ownership-claims`, { expectedRevision });

  return response.data.content;
};

const resolveImageExtension = (file: File) => {
  const filenameExtension = file.name.split('.').pop()?.toLowerCase();
  if (filenameExtension) return filenameExtension;

  return file.type.split('/').pop()?.toLowerCase() ?? '';
};

export const uploadCommunityRoomBanner = async (file: File) => {
  const ticketResponse = await axiosInstance.post<
    ApiResponse<CommunityRoomBannerUploadTicket>
  >('/community/posts/content-images/upload-ticket', {
    extension: resolveImageExtension(file),
  });
  const ticket = ticketResponse.data.content;
  const formData = new FormData();
  formData.append(ticket.uploadFieldName, file);
  await axiosInstanceForMultipart.put(ticket.uploadUrl, formData);

  return new URL(ticket.publicUrl).pathname.replace(/^\/+/, '');
};
