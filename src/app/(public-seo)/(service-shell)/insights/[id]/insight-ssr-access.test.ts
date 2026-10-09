import { describe, expect, it } from 'vitest';
import {
  accessSnapshotMatches,
  mayRenderPublicBody,
} from './insight-ssr-access';

describe('인사이트 SSR 공개 본문 fail-closed 계약', () => {
  it('SEO-SSR-001 live FREE와 캐시 FREE가 일치할 때만 공개 본문을 허용한다', () => {
    expect(mayRenderPublicBody(true, 'FREE')).toBe(true);
    expect(accessSnapshotMatches(true, 'FREE')).toBe(true);
  });

  it.each([
    [true, 'LOCKED'],
    [false, 'FREE'],
    [true, 'UNLOCKED'],
    [false, 'LOCKED'],
  ] as const)('SEO-SSR-002 cached=%s live=%s 경계에서는 본문 0byte 판정을 유지한다', (cached, live) => {
    expect(mayRenderPublicBody(cached, live)).toBe(false);
  });
});
