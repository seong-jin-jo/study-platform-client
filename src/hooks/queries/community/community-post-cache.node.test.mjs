import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMMUNITY_ROOM_POSTS_KEY,
  MY_COMMUNITY_REP_QUERY_KEY,
  updateCommunityPostCollection,
} from './community-post-cache.ts';

const createFeed = () => ({
  popularItems: [],
  items: [
    {
      postId: 42,
      stats: {
        viewCount: 12,
        likeCount: 3,
        commentCount: 2,
      },
    },
  ],
});

test('평판과 방 피드는 서로 다른 최상위 캐시 키를 사용한다', () => {
  assert.notEqual(MY_COMMUNITY_REP_QUERY_KEY[0], COMMUNITY_ROOM_POSTS_KEY[0]);
});

test('도움됨 등록과 취소 카운트를 차례로 반영한다', () => {
  const added = updateCommunityPostCollection(createFeed(), 42, 4);
  const removed = updateCommunityPostCollection(added, 42, 3);

  assert.equal(added.items[0].stats.likeCount, 4);
  assert.equal(removed.items[0].stats.likeCount, 3);
});

test('피드 형태가 아닌 평판 캐시는 변경하지 않는다', () => {
  const rep = {
    repBalance: 12,
    repEarnedTotal: 24,
    recentEarns: [],
  };

  assert.equal(updateCommunityPostCollection(rep, 42, 4), rep);
});
