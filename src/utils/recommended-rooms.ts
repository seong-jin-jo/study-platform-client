import type { CommunityRoomSummary } from '@/types/community/room-hub';

/**
 * 빈 방 상태(입장한 방 0개, 섬에 연결된 공부방 없음)에서 보여 줄 인기 방을 고른다.
 * 값은 방 목록 API(/community/rooms)가 주는 memberCount·newPostsToday 만 쓴다.
 * 이미 들어간 방과 회원이 0명인 방(코호트 방 등)은 '인기'가 아니므로 뺀다.
 */
export const RECOMMENDED_ROOM_LIMIT = 3;

export function pickRecommendedRooms(
  rooms: readonly CommunityRoomSummary[] | undefined,
  limit: number = RECOMMENDED_ROOM_LIMIT,
): CommunityRoomSummary[] {
  return [...(rooms ?? [])]
    .filter(
      (room) => room.membership?.state !== 'ACTIVE' && room.memberCount > 0,
    )
    .sort(
      (a, b) =>
        b.memberCount - a.memberCount ||
        (b.newPostsToday ?? 0) - (a.newPostsToday ?? 0) ||
        a.roomId - b.roomId,
    )
    .slice(0, Math.max(0, limit));
}

/** 방 소개의 첫 줄만 한 줄 설명으로 쓴다. 비면 빈 문자열. */
export function roomOneLiner(description: string | undefined): string {
  return (
    (description ?? '')
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ''
  );
}
