import { describe, expect, it } from 'vitest';
import { resolveAppintossHref } from './resolve-appintoss-href.mjs';

describe('App-in-Toss navigation allowlist', () => {
  it('AIT-NV-01 웹 동적 경로를 7개 정적 경로의 검색 매개변수로 바꾼다', () => {
    expect(resolveAppintossHref('/insights/event-loop')).toBe(
      '/insights/read/?slug=event-loop',
    );
    expect(resolveAppintossHref('/community/42')).toBe(
      '/community/read/?postId=42',
    );
    expect(resolveAppintossHref('/class/vibe-intro')).toBe(
      '/class/detail/?slug=vibe-intro',
    );
  });

  it('AIT-NV-03 끝 슬래시가 있는 정적 경로와 검색 매개변수를 허용한다', () => {
    expect(resolveAppintossHref('/insights/')).toBe('/insights/');
    expect(resolveAppintossHref('/community/')).toBe('/community/');
    expect(resolveAppintossHref('/class/')).toBe('/class/');
    expect(resolveAppintossHref('/class/detail/?slug=a')).toBe(
      '/class/detail/?slug=a',
    );
  });

  it('AIT-NV-04 끝 슬래시가 있는 동적 경로를 정적 상세 경로로 바꾼다', () => {
    expect(resolveAppintossHref('/insights/koans/12/')).toBe(
      '/insights/read/?kind=koan&id=12',
    );
    expect(resolveAppintossHref('/community/34/')).toBe(
      '/community/read/?postId=34',
    );
  });

  it('AIT-NV-02 외부 URL과 허용 목록 밖 경로를 거절한다', () => {
    expect(resolveAppintossHref('https://www.zeroone.it.kr')).toBeUndefined();
    expect(resolveAppintossHref('/payment/1')).toBeUndefined();
    expect(resolveAppintossHref('//evil.example')).toBeUndefined();
    expect(resolveAppintossHref('/insights\\evil')).toBeUndefined();
  });

  it('AIT-M5-01 인사이트 예약 세그먼트를 일반 글 slug보다 먼저 처리한다', () => {
    expect(resolveAppintossHref('/insights/koans')).toBe('/insights/');
    expect(resolveAppintossHref('/insights/land')).toBe('/insights/');
    expect(resolveAppintossHref('/insights/koans')).not.toContain('slug=koans');
  });

  it('AIT-M4-01 앱에 상세 화면이 없는 공부방과 인사이트 섬 경로를 만들지 않는다', () => {
    expect(resolveAppintossHref('/community/rooms/12')).toBeUndefined();
    expect(resolveAppintossHref('/insights/land/backend')).toBeUndefined();
  });
});
