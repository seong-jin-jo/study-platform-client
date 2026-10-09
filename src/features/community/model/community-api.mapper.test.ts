import { describe, expect, it } from 'vitest';
import type { CommunityPostTeaserApiResponse } from '@/features/community/api/community-api.types';
import { mapCommunityPostDetail } from './community-api.mapper';

describe('mapCommunityPostDetail preview contract', () => {
  it('maps the flat 300-character preview without reconstructing full HTML', () => {
    const response = {
      postId: 913,
      title: '첫 배포에서 막힌 것',
      access: 'PREVIEW',
      previewText: '미입장 회원에게 허용된 평문 미리보기',
      locked: {
        reason: 'ROOM_MEMBERSHIP_REQUIRED',
        joinRoomId: 17,
      },
      metadata: {
        author: {
          publicProfileUuid: '550e8400-e29b-41d4-a716-446655440000',
          nickname: '모카',
        },
        sourceRoom: { roomId: 17, name: 'AI 자동화' },
        publishedAt: '2026-08-05T10:00:00+09:00',
      },
      board: 'free',
      stats: { viewCount: 10, commentCount: 2, helpfulCount: 3 },
    } satisfies CommunityPostTeaserApiResponse;

    const mapped = mapCommunityPostDetail(response);

    expect(mapped.content).toEqual(['미입장 회원에게 허용된 평문 미리보기']);
    expect(mapped.contentHtml).toBeUndefined();
    expect(mapped.access).toEqual({
      mode: 'TEASER',
      roomId: 17,
      canJoin: true,
    });
    expect(mapped.authorName).toBe('모카');
    expect(mapped.authorPublicProfileUuid).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });
});
