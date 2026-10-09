/* eslint-disable @rushstack/no-new-null -- backend JSON contract returns nullable cursors. */
export interface CommunityRepContextResponse {
  weeksTogether: number;
  weeksTogetherLabel: string;
  publicProfileUrl?: string | null;
  rooms: {
    count: number;
    items: Array<{ roomId: number; name: string }>;
    nextCursor?: string | null;
  };
  posts: {
    count: number;
    items: Array<{ postId: number; title: string; publishedAt: string }>;
    nextCursor?: string | null;
  };
}
