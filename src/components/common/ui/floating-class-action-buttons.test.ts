import { describe, expect, it } from 'vitest';
import {
  resolveServiceUtilityLayout,
  shouldShowMobileScrollToTop,
} from './floating-class-action-buttons';

describe('shouldShowMobileScrollToTop', () => {
  it('keeps the consultation action visible before one viewport of scrolling', () => {
    expect(shouldShowMobileScrollToTop(811, 812)).toBe(false);
  });

  it('switches to the scroll-to-top action after one viewport of scrolling', () => {
    expect(shouldShowMobileScrollToTop(812, 812)).toBe(true);
  });
});

describe('resolveServiceUtilityLayout', () => {
  it.each([
    ['/insights', 'sprint8-flow'],
    ['/insights/land/dep', 'sprint8-flow'],
    ['/insights/koans', 'sprint8-flow'],
    ['/insights/dep-article-1', 'sprint8-responsive'],
  ] as const)('%s의 Sprint8 utility 배치를 고정한다', (pathname, expected) => {
    expect(resolveServiceUtilityLayout(pathname)).toBe(expected);
  });

  it('인사이트에서 들어온 공부방만 Sprint8 responsive utility를 쓴다', () => {
    expect(resolveServiceUtilityLayout('/community/rooms/8', 'dep')).toBe(
      'sprint8-responsive',
    );
    expect(resolveServiceUtilityLayout('/community/rooms/8')).toBe(
      'community-responsive',
    );
  });

  it('커뮤니티와 일반 서비스의 기존 utility mode를 보존한다', () => {
    expect(resolveServiceUtilityLayout('/community/questions/101')).toBe(
      'community-responsive',
    );
    expect(resolveServiceUtilityLayout('/home')).toBe('fixed');
  });
});
