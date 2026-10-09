'use client';

import {
  GuestHomeFeedBody,
  HomeFeedLoading,
  HomeFeedUnavailable,
} from '@/components/retention/home-feed';
import { useCommunityRoomHubQuery } from '@/hooks/queries/community/use-community-room-hub-query';
import { usePublicCommunityPostsQuery } from '@/hooks/queries/community/use-community-room-posts-query';
import { usePublicHomeFeedQuery } from '@/hooks/queries/retention/use-retention-queries';

const EMPTY_ROOM_FILTERS = {};

export default function PublicHomeFeed() {
  const postFeedQuery = usePublicCommunityPostsQuery();
  const roomHubQuery = useCommunityRoomHubQuery(EMPTY_ROOM_FILTERS);
  const publicFeedQuery = usePublicHomeFeedQuery();

  if (
    postFeedQuery.isLoading ||
    roomHubQuery.isLoading ||
    publicFeedQuery.isLoading
  ) {
    return <HomeFeedLoading />;
  }

  if (
    postFeedQuery.isError ||
    roomHubQuery.isError ||
    publicFeedQuery.isError ||
    !postFeedQuery.data ||
    !roomHubQuery.data ||
    !publicFeedQuery.data
  ) {
    return (
      <HomeFeedUnavailable
        onRetry={() => {
          Promise.all([
            postFeedQuery.refetch(),
            roomHubQuery.refetch(),
            publicFeedQuery.refetch(),
          ]).catch(() => undefined);
        }}
      />
    );
  }

  return (
    <GuestHomeFeedBody
      postFeed={postFeedQuery.data}
      publicFeed={publicFeedQuery.data}
      roomLimit={roomHubQuery.data.activeRoomLimit}
    />
  );
}
