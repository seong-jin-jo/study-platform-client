import { describe, expect, it } from 'vitest';
import {
  assertAppintossPositiveId,
  assertAppintossSlug,
  unwrapAppintossBaseResponse,
} from './appintoss-public-api';

describe('App-in-Toss public API identifier contract', () => {
  it('AIT-AC-01 공개 조회에 허용된 slug와 양수 ID를 정규화한다', () => {
    expect(assertAppintossSlug(' event-loop_101 ')).toBe('event-loop_101');
    expect(assertAppintossPositiveId('42')).toBe(42);
  });

  it('AIT-AC-02 경로 주입 slug와 0 이하 ID를 거절한다', () => {
    expect(() => assertAppintossSlug('../admin')).toThrow('Invalid');
    expect(() => assertAppintossPositiveId(0)).toThrow('Invalid');
  });

  it('AIT-AC-03 BaseResponse의 content만 공개 응답으로 반환한다', () => {
    expect(
      unwrapAppintossBaseResponse({
        statusCode: 200,
        timestamp: '2026-10-05T00:00:00Z',
        content: { slug: 'event-loop' },
        message: null,
      }),
    ).toEqual({ slug: 'event-loop' });
  });

  it('AIT-AC-04 공통 응답 봉투가 아닌 직접 본문은 거절한다', () => {
    expect(() => unwrapAppintossBaseResponse({ slug: 'event-loop' })).toThrow(
      'Invalid App-in-Toss API response envelope',
    );
  });
});
