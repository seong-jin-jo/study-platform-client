import { describe, expect, it } from 'vitest';
import { shouldUseMenuMobileSheet } from '@/components/common/ui/menu';
import { getFeedLessonMenuOptions } from './feed-menu-options';

describe('feed lesson menu options', () => {
  it('counts the rendered all option when choosing the mobile sheet', () => {
    const renderedOptions = getFeedLessonMenuOptions(
      Array.from({ length: 6 }, (_, index) => ({
        label: `Lesson ${index + 1}`,
        lessonId: index + 1,
      })),
    );

    expect(renderedOptions).toHaveLength(7);
    expect(renderedOptions[0]).toEqual({ label: '전체', lessonId: null });
    expect(shouldUseMenuMobileSheet(renderedOptions)).toBe(true);
  });
});
