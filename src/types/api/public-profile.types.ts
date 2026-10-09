/* eslint-disable @rushstack/no-new-null -- backend JSON contract returns nullable profile fields and cursors. */
export interface PublicProfileRoomItem {
  roomId: number;
  name: string;
  visibility: 'PUBLIC';
}

export interface PublicProfilePostItem {
  postId: number;
  title: string;
  previewText: string;
  destination: string;
}

export interface PublicProfileCursorPage<T> {
  items: T[];
  nextCursor?: string | null;
}

export interface PublicProfileResponse {
  publicProfileUuid: string;
  nickname: string;
  profileImageUrl?: string | null;
  simpleIntroduction?: string | null;
  buildGoal?: string | null;
  weeksTogether: number;
  weeksTogetherLabel: string;
  rooms: PublicProfileCursorPage<PublicProfileRoomItem>;
  posts: PublicProfileCursorPage<PublicProfilePostItem>;
  canonicalPath: string;
  indexEligibility: {
    indexable: boolean;
    reason: string;
  };
  updatedAt: string;
}

export interface PublicProfileSitemapResource {
  publicProfileUuid: string;
  canonicalPath: string;
  updatedAt: string;
}

export interface PublicProfileSitemapResourcePage {
  items: PublicProfileSitemapResource[];
  nextCursor?: string | null;
  snapshot: string;
  datasetTotalItems: number;
  totalItems: number;
}
