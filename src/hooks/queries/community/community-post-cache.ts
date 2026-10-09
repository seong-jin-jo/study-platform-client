import type {
  CommunityPostFeedResponse,
  CommunityPostSearchResponse,
  CommunityPostSummary,
} from '@/types/community/post';

export const COMMUNITY_ROOM_POSTS_KEY = ['community-room-posts'] as const;
export const MY_COMMUNITY_REP_QUERY_KEY = ['community-rep', 'me'] as const;

export type CommunityPostCollection =
  | CommunityPostFeedResponse
  | CommunityPostSearchResponse;

const updatePost = (
  post: CommunityPostSummary,
  likeCount: number,
): CommunityPostSummary => ({
  ...post,
  stats: {
    ...post.stats,
    likeCount,
  },
});

export function updateCommunityPostCollection(
  collection: CommunityPostCollection,
  postId: number,
  likeCount: number,
): CommunityPostCollection;
export function updateCommunityPostCollection(
  collection: unknown,
  postId: number,
  likeCount: number,
): unknown;
export function updateCommunityPostCollection(
  collection: unknown,
  postId: number,
  likeCount: number,
) {
  if (
    !collection ||
    typeof collection !== 'object' ||
    !('items' in collection) ||
    !Array.isArray(collection.items)
  ) {
    return collection;
  }

  const postCollection = collection as CommunityPostCollection;

  return {
    ...postCollection,
    items: postCollection.items.map((post) =>
      post.postId === postId ? updatePost(post, likeCount) : post,
    ),
    ...('popularItems' in postCollection
      ? {
          popularItems: postCollection.popularItems.map((post) =>
            post.postId === postId ? updatePost(post, likeCount) : post,
          ),
        }
      : {}),
  };
}
