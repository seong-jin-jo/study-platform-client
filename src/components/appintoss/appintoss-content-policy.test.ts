import { describe, expect, it } from 'vitest';
import { isAllowedAppintossHref } from './appintoss-content-policy';

describe('App-in-Toss article link boundary', () => {
  it('AIT-N6-01 앱 내부 절대 경로와 본문 앵커는 허용한다', () => {
    expect(isAllowedAppintossHref('/insights/read?slug=api-key')).toBe(true);
    expect(isAllowedAppintossHref('#example')).toBe(true);
  });

  it('AIT-N6-02 역슬래시·프로토콜 상대·외부 URL 우회를 거절한다', () => {
    expect(isAllowedAppintossHref('/\\evil.example')).toBe(false);
    expect(isAllowedAppintossHref('//evil.example')).toBe(false);
    expect(isAllowedAppintossHref('https://evil.example')).toBe(false);
  });
});
