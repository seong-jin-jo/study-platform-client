import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CourseCompletionRecapResponse } from '@/types/api/course.types';
import { FreeCompletionSurvey } from './free-completion-survey';

vi.mock('@/components/common/ui/star-rating-input', () => ({
  default: ({ precision }: { precision?: string }) =>
    createElement('div', {
      'data-testid': 'survey-star-rating',
      'data-precision': precision,
    }),
}));

vi.mock('@/hooks/queries/course/course-queries', () => ({
  useGetCourseFeedbackOptions: () => ({
    data: { goodOptions: [], badOptions: [] },
    isLoading: false,
    isError: false,
  }),
  useSubmitCourseFeedback: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: (selector: (state: { showToast: () => void }) => unknown) =>
    selector({ showToast: vi.fn() }),
}));

const recap: CourseCompletionRecapResponse = {
  completionType: 'FREE',
  latestCompletedLessonCount: 6,
  studyDays: 3,
  siteUrlCount: 1,
  completedAt: '2026-08-12T00:00:00Z',
  operatorMessage: null,
};

describe('FreeCompletionSurvey 별점 계약', () => {
  it('소비 화면이 별점 입력을 정수 단위로 연결한다', () => {
    const markup = renderToStaticMarkup(
      createElement(FreeCompletionSurvey, {
        courseId: 1,
        recap,
        slug: 'test-class',
      }),
    );

    expect(markup).toContain('data-testid="survey-star-rating"');
    expect(markup).toContain('data-precision="whole"');
  });
});
