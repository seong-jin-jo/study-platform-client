/* eslint-disable @rushstack/no-new-null -- backend JSON contract can explicitly return null for nullable fields. */
import type {
  CommunityBoard,
  CommunityCommentReaction,
  CommunityMemberRole,
  CommunityPostReaction,
} from '@/types/community/domain';

export interface CommunityBaseResponse<T> {
  content: T;
  errorCode?: string;
  errorName?: string;
  message?: string;
  statusCode?: number;
}

export interface CommunityPostSummaryApiResponse {
  postId: number;
  board: string;
  title: string;
  excerpt: string;
  previewImageUrl?: string | null;
  previewImageAlt?: string | null;
  author: {
    memberId?: number | null;
    publicProfileUuid?: string | null;
    name?: string | null;
    profileImageUrl?: string | null;
    role?: CommunityMemberRole | null;
  };
  stats: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
  };
  viewer: {
    isAuthenticated: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPostFeedApiResponse {
  popularItems: CommunityPostSummaryApiResponse[];
  items: CommunityPostSummaryApiResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  totalPostCount: number;
}

export interface CommunityPostFullApiResponse {
  postId: number;
  revision: number;
  board: string;
  title: string;
  contentHtml: string;
  excerpt: string;
  previewImageUrl?: string | null;
  previewImageAlt?: string | null;
  author: {
    memberId?: number | null;
    publicProfileUuid?: string | null;
    name?: string | null;
    profileImageUrl?: string | null;
    role?: CommunityMemberRole | null;
    intro?: string | null;
  };
  stats: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
  };
  viewer: {
    isAuthenticated: boolean;
    canEdit: boolean;
    canDelete: boolean;
    myPostReaction?: CommunityPostReaction | null;
  };
  insightQuote?: {
    documentId: string;
    slug: string;
    title: string;
    excerpt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPostTeaserApiResponse {
  postId: number;
  title: string;
  access: 'PREVIEW';
  previewText: string;
  locked: {
    reason: 'ROOM_MEMBERSHIP_REQUIRED';
    joinRoomId: number;
  };
  metadata: {
    author: {
      publicProfileUuid?: string | null;
      nickname?: string | null;
    };
    sourceRoom: { roomId: number; name?: string | null };
    publishedAt: string;
  };
  board: string;
  stats: {
    viewCount: number;
    commentCount: number;
    helpfulCount: number;
  };
}

export interface CommunityPostFullDetailApiResponse {
  access: {
    mode: 'FULL';
    roomId?: number | null;
    capabilities: {
      comment: boolean;
      helpful: boolean;
      edit: boolean;
      delete: boolean;
    };
  };
  post: CommunityPostFullApiResponse;
  comments: CommunityCommentPageApiResponse;
}

export type CommunityPostDetailApiResponse =
  | CommunityPostTeaserApiResponse
  | CommunityPostFullDetailApiResponse;

export interface CommunityCommentApiResponse {
  commentId: number;
  revision: number;
  parentCommentId?: number;
  depth: number;
  author: {
    memberId?: number | null;
    publicProfileUuid?: string | null;
    name?: string | null;
    profileImageUrl?: string | null;
    role?: CommunityMemberRole | null;
  };
  content: string;
  isDeleted: boolean;
  isEdited: boolean;
  stats: {
    likeCount: number;
    dislikeCount: number;
    replyCount: number;
  };
  viewer: {
    isAuthenticated: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canReply: boolean;
    myCommentReaction?: CommunityCommentReaction | null;
  };
  createdAt: string;
  updatedAt: string;
  replies: CommunityCommentApiResponse[];
}

export interface CommunityCommentPageApiResponse {
  items: CommunityCommentApiResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  totalCommentCount: number;
}

export interface CommunityPostReactionApiResponse {
  likeCount: number;
  myPostReaction?: CommunityPostReaction | null;
}

export interface CommunityPostViewEventApiResponse {
  counted: boolean;
  viewCount: number;
}

export interface CommunityCommentReactionApiResponse {
  likeCount: number;
  dislikeCount: number;
  myCommentReaction?: CommunityCommentReaction | null;
}

export interface CommunityCommentMutationApiResponse {
  comment: CommunityCommentApiResponse;
  postCommentCount: number;
}

export interface CommunityCommentUpdateApiResponse {
  comment: CommunityCommentApiResponse;
}

export interface CommunityCommentDeleteApiResponse {
  deleted: boolean;
  deleteMode: string;
  comment: CommunityCommentApiResponse;
  postCommentCount: number;
}

export interface CommunityDeletePostApiResponse {
  postId: number;
  deleted: boolean;
  deleteMode: string;
}

export interface CommunityContentImageUploadTicketApiResponse {
  uploadUrl: string;
  publicUrl: string;
  uploadMethod: string;
  uploadFieldName: string;
  expiresAt: string;
}

export interface CommunityFeedQueryParams {
  board: CommunityBoard | 'all';
  page: number;
  size: number;
  cohortId?: number;
}

export interface CommunityPostUpsertRequest {
  board: CommunityBoard | 'question';
  title: string;
  contentHtml: string;
  cohortId?: number;
  roomId?: number;
  insightReference?: {
    documentId: string;
  };
}

export interface CommunityCommentRequest {
  content: string;
}

export interface CommunityCommentReactionRequest {
  type: CommunityCommentReaction;
}

export interface CommunityPostReactionRequest {
  type: CommunityPostReaction;
}
