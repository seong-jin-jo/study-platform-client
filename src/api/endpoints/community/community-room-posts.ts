import { axiosInstance } from '@/api/client/axios';
import type {
  CommunityPostFeedResponse,
  CommunityPostSearchResponse,
  HelpfulPostResponse,
  MyCommunityRepResponse,
} from '@/types/community/post';

interface ApiResponse<T> {
  content: T;
}

export const getCommunityPosts = async ({
  page = 1,
  size = 5,
}: {
  page?: number;
  size?: number;
} = {}) => {
  const response = await axiosInstance.get<
    ApiResponse<CommunityPostFeedResponse>
  >('/community/posts', { params: { page, size } });

  return response.data.content;
};

export const getCommunityRoomPosts = async (roomId: number) => {
  const response = await axiosInstance.get<
    ApiResponse<CommunityPostFeedResponse>
  >('/community/posts', { params: { roomId, page: 1, size: 50 } });

  return response.data.content;
};

export const searchCommunityRoomPosts = async ({
  roomId,
  q,
  sort,
}: {
  roomId: number;
  q: string;
  sort: string;
}) => {
  const response = await axiosInstance.get<
    ApiResponse<CommunityPostSearchResponse>
  >('/community/posts/search', {
    params: { roomId, q, sort, page: 1, size: 50 },
  });

  return response.data.content;
};

export const setCommunityPostHelpful = async ({
  postId,
  helpful,
}: {
  postId: number;
  helpful: boolean;
}) => {
  const response = helpful
    ? await axiosInstance.post<ApiResponse<HelpfulPostResponse>>(
        `/community/posts/${postId}/helpful`,
      )
    : await axiosInstance.delete<ApiResponse<HelpfulPostResponse>>(
        `/community/posts/${postId}/helpful`,
      );

  return response.data.content;
};

export const getMyRep = async () => {
  const response = await axiosInstance.get<ApiResponse<MyCommunityRepResponse>>(
    '/community/posts/rep/me',
  );

  return response.data.content;
};
