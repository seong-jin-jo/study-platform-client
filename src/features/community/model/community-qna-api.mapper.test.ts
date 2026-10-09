import { describe, expect, it } from 'vitest';
import { mapCommunityQnaAuthor } from './community-qna-api.mapper';

describe('mapCommunityQnaAuthor public profile identity', () => {
  it('passes through the server UUID used by the approved profile route', () => {
    const mapped = mapCommunityQnaAuthor({
      memberId: 42,
      publicProfileUuid: '550e8400-e29b-41d4-a716-446655440042',
      name: '수연',
      profileImageUrl: null,
      role: 'developer',
    });

    expect(mapped.publicProfileUuid).toBe(
      '550e8400-e29b-41d4-a716-446655440042',
    );
  });
});
