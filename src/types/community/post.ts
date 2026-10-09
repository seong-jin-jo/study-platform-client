export interface CommunityPostAuthor {
  memberId: number;
  publicProfileUuid?: string | null;
  name: string;
  profileImageUrl: string | null;
  role: string | null;
}

export interface CommunityPostStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface CommunityPostViewer {
  isAuthenticated: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CommunityPostSummary {
  postId: number;
  revision: number;
  board: string;
  title: string;
  excerpt: string;
  previewImageUrl: string | null;
  previewImageAlt: string | null;
  author: CommunityPostAuthor;
  stats: CommunityPostStats;
  viewer: CommunityPostViewer;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPostFeedResponse {
  popularItems: CommunityPostSummary[];
  items: CommunityPostSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  totalPostCount: number;
}

export interface CommunityPostSearchResponse {
  items: CommunityPostSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface HelpfulPostResponse {
  helpful: boolean;
  likeCount: number;
  authorRepDelta: number;
}

export interface MyCommunityRepRecentEarn {
  postId: number | null;
  amount: number;
  at: string;
}

export interface MyCommunityRepResponse {
  repBalance: number;
  repEarnedTotal: number;
  recentEarns: MyCommunityRepRecentEarn[];
}

export type CommunityPostSort = 'popular' | 'recent';

export interface CommunityPostSearchParams {
  cohortId: number;
  q: string;
  sort: CommunityPostSort;
}
