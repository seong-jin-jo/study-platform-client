import { describe, expect, it } from 'vitest';
import type { CommunityRoomSummary } from '@/types/community/room-hub';
import { pickRecommendedRooms, roomOneLiner } from './recommended-rooms';

const room = (
  roomId: number,
  memberCount: number,
  extra: Partial<CommunityRoomSummary> = {},
): CommunityRoomSummary =>
  ({
    roomId,
    name: `방 ${roomId}`,
    description: '',
    memberCount,
    newPostsToday: 0,
    membership: { state: 'NONE', canJoin: true },
    ...extra,
  }) as CommunityRoomSummary;

describe('REC-ROOM 인기 방 추천 선택', () => {
  it('REC-ROOM-001 회원 수가 많은 순으로 최대 3개를 고른다', () => {
    const picked = pickRecommendedRooms([
      room(17, 8),
      room(16, 9),
      room(7, 1),
      room(3, 2),
    ]);
    expect(picked.map((r) => r.roomId)).toEqual([16, 17, 3]);
  });

  it('REC-ROOM-002 회원 0명인 방과 이미 들어간 방은 추천하지 않는다', () => {
    const picked = pickRecommendedRooms([
      room(1, 0),
      room(2, 5, { membership: { state: 'ACTIVE', canJoin: false } }),
      room(3, 4),
    ]);
    expect(picked.map((r) => r.roomId)).toEqual([3]);
  });

  it('REC-ROOM-003 회원 수가 같으면 오늘 새 글, 그다음 방 번호 순이고 원본은 바꾸지 않는다', () => {
    const source = [room(9, 3), room(8, 3, { newPostsToday: 2 }), room(7, 3)];
    const picked = pickRecommendedRooms(source);
    expect(picked.map((r) => r.roomId)).toEqual([8, 7, 9]);
    expect(source.map((r) => r.roomId)).toEqual([9, 8, 7]);
  });

  it('REC-ROOM-004 목록이 없거나 비면 빈 배열이고 limit 0 도 빈 배열이다', () => {
    expect(pickRecommendedRooms(undefined)).toEqual([]);
    expect(pickRecommendedRooms([])).toEqual([]);
    expect(pickRecommendedRooms([room(1, 3)], 0)).toEqual([]);
  });

  it('REC-ROOM-005 방 소개는 첫 줄만 한 줄 설명으로 쓴다', () => {
    expect(roomOneLiner('첫 줄\n둘째 줄')).toBe('첫 줄');
    expect(roomOneLiner('\n  \n둘째')).toBe('둘째');
    expect(roomOneLiner(undefined)).toBe('');
  });
});
