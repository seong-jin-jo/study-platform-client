interface FeedLessonMenuOption {
  label: string;
  // eslint-disable-next-line @rushstack/no-new-null -- 기존 피드 필터의 전체 항목 계약은 null이다.
  lessonId: number | null;
}

export function getFeedLessonMenuOptions(
  lessons: ReadonlyArray<{ label: string; lessonId: number }>,
): FeedLessonMenuOption[] {
  return [{ label: '전체', lessonId: null }, ...lessons];
}
