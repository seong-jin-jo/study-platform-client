import { describe, expect, it } from 'vitest';
import type { CourseDetailResponse } from '@/types/api/course.types';
import {
  canShowCourseFreeEnrollCta,
  getCourseViewerStatusLabel,
  hasCourseFullAccess,
  isCourseFreeEnrolled,
  isCoursePaidEnrolled,
} from './course-viewer-status';

const baseCourse: CourseDetailResponse = {
  courseId: 1,
  slug: 'sample-course',
  viewerStatus: 'LOGIN_ONLY',
  title: 'Sample',
  description: null,
  thumbnailUrl: null,
  learnerCount: null,
  durationDays: null,
  completionCount: null,
  exploringCount: null,
  plans: null,
  earlyBirdEndsAt: null,
  canFreeEnroll: null,
  isFreeEnrolled: null,
  freeLessonCount: null,
  journeyMapAvailable: null,
  hasFullAccess: null,
  isPaidEnrolled: null,
  canPurchase: null,
};

describe('course viewer status helpers', () => {
  it('자격(결제/무료수강) 없는 로그인 사용자는 수강 라벨이 없다', () => {
    const course = {
      ...baseCourse,
      viewerStatus: 'LOGIN_ONLY',
      canPurchase: true,
    } satisfies CourseDetailResponse;

    expect(hasCourseFullAccess(course)).toBe(false);
    expect(isCourseFreeEnrolled(course)).toBe(false);
    expect(isCoursePaidEnrolled(course)).toBe(false);
    expect(getCourseViewerStatusLabel(course)).toBeUndefined();
  });

  it('무료수강 CTA 노출은 canFreeEnroll 값만으로 결정된다', () => {
    const course = {
      ...baseCourse,
      viewerStatus: 'LOGIN_ONLY',
      canFreeEnroll: true,
    } satisfies CourseDetailResponse;

    expect(canShowCourseFreeEnrollCta(course)).toBe(true);
  });

  it('무료수강자는 무료수강중 라벨을 가진다', () => {
    const course = {
      ...baseCourse,
      viewerStatus: 'FREE_ENROLLED',
      isFreeEnrolled: true,
    } satisfies CourseDetailResponse;

    expect(isCourseFreeEnrolled(course)).toBe(true);
    expect(getCourseViewerStatusLabel(course)).toBe('무료수강중');
  });

  it('결제자는 결제 수강중 라벨과 전체 접근 권한을 가진다', () => {
    const course = {
      ...baseCourse,
      viewerStatus: 'PAID',
      isPaidEnrolled: true,
      hasFullAccess: true,
    } satisfies CourseDetailResponse;

    expect(isCoursePaidEnrolled(course)).toBe(true);
    expect(hasCourseFullAccess(course)).toBe(true);
    expect(getCourseViewerStatusLabel(course)).toBe('결제 수강중');
  });
});
