import { describe, expect, it } from 'vitest';
import {
  buildCommunityRoomWriteHref,
  normalizeCommunityCohortIdParam,
} from './community-route';

describe('community room write route', () => {
  it('builds a room-scoped write URL', () => {
    expect(buildCommunityRoomWriteHref(7)).toBe('/community/write?roomId=7');
  });

  it('accepts only a positive integer cohortId', () => {
    expect(normalizeCommunityCohortIdParam('7')).toBe(7);
    expect(normalizeCommunityCohortIdParam(['8', '9'])).toBe(8);
    expect(normalizeCommunityCohortIdParam('0')).toBeUndefined();
    expect(normalizeCommunityCohortIdParam('1.5')).toBeUndefined();
    expect(normalizeCommunityCohortIdParam('invalid')).toBeUndefined();
  });
});
