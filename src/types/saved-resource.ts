export const SAVED_RESOURCE_TYPE = {
  COMMUNITY_POST: 'COMMUNITY_POST',
  INSIGHT_ARTICLE: 'INSIGHT_ARTICLE',
} as const;

export type SavedResourceType =
  (typeof SAVED_RESOURCE_TYPE)[keyof typeof SAVED_RESOURCE_TYPE];

export type SavedResourceState = 'AVAILABLE' | 'DELETED' | 'UNAVAILABLE';

export interface SavedResourceItem {
  resourceType: SavedResourceType;
  resourceKey: string;
  title: string;
  preview?: string | null;
  destination?: string | null;
  savedAt: string;
  resourceState: SavedResourceState;
  unavailableMessage?: string | null;
  roomId?: number | null;
  roomName?: string | null;
  roomAvatarUrl?: string | null;
  roomMemberCount?: number | null;
  roomJoined?: boolean | null;
  authorName?: string | null;
  createdAt?: string | null;
  thumbnailUrl?: string | null;
  helpfulCount?: number | null;
  commentCount?: number | null;
  viewCount?: number | null;
  coverUrl?: string | null;
  categorySlug?: string | null;
}

export interface SavedResourceList {
  items: SavedResourceItem[];
  nextCursor?: string | null;
}

export interface SavedResourceMutationResult {
  resourceType: SavedResourceType;
  resourceKey: string;
  saved: boolean;
  resourceState: SavedResourceState;
  updatedAt: string;
}
