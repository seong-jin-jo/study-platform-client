import { describe, expect, it } from 'vitest';
import {
  resolveRoomInsightIsland,
  resolveRoomMemberRailState,
} from '@/components/community/pages/community-room-detail-page';
import type { InsightMap } from '@/types/insight-worldmap';

const map: InsightMap = {
  islands: [
    {
      articles: [],
      bridgeRoomId: 8,
      bridgeRoomName: '배포·운영방',
      explorerCount: 14,
      islandId: 1,
      name: '배포·운영',
      progress: { conquered: false, conqueredAt: null, read: 5, total: 8 },
      slug: 'dep',
    },
    {
      articles: [],
      bridgeRoomId: 9,
      bridgeRoomName: 'DB방',
      explorerCount: 9,
      islandId: 2,
      name: '데이터베이스',
      progress: { conquered: false, conqueredAt: null, read: 0, total: 5 },
      slug: 'db',
    },
  ],
  readingBudget: { balance: 5, dailyCap: 5 },
};

describe('resolveRoomInsightIsland', () => {
  it('query 문자열이 아닌 bridgeRoomId 역매핑으로 방 8의 개척지를 결정한다', () => {
    expect(resolveRoomInsightIsland(map, 8)?.slug).toBe('dep');
    expect(resolveRoomInsightIsland(map, 8)?.name).toBe('배포·운영');
  });

  it('다른 방의 개척지를 방 8에 재사용하지 않는다', () => {
    expect(resolveRoomInsightIsland(map, 8)?.slug).not.toBe('db');
    expect(resolveRoomInsightIsland(map, 999)).toBeNull();
  });
});

describe('resolveRoomMemberRailState', () => {
  it('멤버 데이터가 둘 이상이면 populated 상태다', () => {
    expect(
      resolveRoomMemberRailState({
        membersProvided: true,
        postsPending: false,
        visibleMemberCount: 2,
      }),
    ).toBe('populated');
  });

  it('멤버가 한 명이면 alone 상태다', () => {
    expect(
      resolveRoomMemberRailState({
        membersProvided: true,
        postsPending: false,
        visibleMemberCount: 1,
      }),
    ).toBe('alone');
  });

  it('멤버 데이터와 피드를 함께 기다리면 loading 상태다', () => {
    expect(
      resolveRoomMemberRailState({
        membersProvided: false,
        postsPending: true,
        visibleMemberCount: 0,
      }),
    ).toBe('loading');
  });
});
