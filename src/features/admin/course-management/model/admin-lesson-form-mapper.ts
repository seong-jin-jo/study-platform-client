import { normalizeLessonContentToMarkdown } from '@/components/common/ui/editor/lesson-html-to-markdown';
import type {
  AdminLessonDetailResponse,
  AdminLessonUpsertRequest,
} from '@/features/admin/course-management/model/admin-course-management-contract';
import { normalizeMarkdownContent } from '@/utils/markdown-content-normalize';
import { extractImageUrls } from '@/utils/markdown-content-images';

// 이미지 URL에서 storage key(경로)만 뽑는다. 서명(query) 차이는 무시하고 같은 이미지인지 식별하기 위함.
// 예) https://host/images/lesson-content/uuid.png?X-Amz-... → images/lesson-content/uuid.png
const imageStorageKey = (url: string): string | null => {
  try {
    return new URL(url).pathname.replace(/^\/+/, '');
  } catch {
    return null;
  }
};

/**
 * localStorage draft(자동임시저장)에 박힌 이미지 URL은 업로드 당시의 presigned 서명이라 시간이 지나면
 * 만료된다. 서버 응답(매 조회 시 재서명된 URL)에서 같은 storage key를 가진 URL을 찾아 교체해, draft를
 * 복원해도 만료되지 않은 이미지를 렌더하게 한다. 서버에 아직 없는(미저장) 이미지는 그대로 둔다.
 */
export const reconcileDraftImageUrls = (
  draftContent: string,
  serverContent: string,
): string => {
  if (!draftContent) {
    return draftContent;
  }

  const serverUrlByKey = new Map<string, string>();
  for (const url of extractImageUrls(serverContent)) {
    const key = imageStorageKey(url);
    if (key) {
      serverUrlByKey.set(key, url);
    }
  }
  if (serverUrlByKey.size === 0) {
    return draftContent;
  }

  let reconciled = draftContent;
  for (const draftUrl of extractImageUrls(draftContent)) {
    const key = imageStorageKey(draftUrl);
    if (!key) {
      continue;
    }
    const freshUrl = serverUrlByKey.get(key);
    if (freshUrl && freshUrl !== draftUrl) {
      reconciled = reconciled.split(draftUrl).join(freshUrl);
    }
  }
  return reconciled;
};

export const toAdminLessonForm = (
  lesson: AdminLessonDetailResponse,
): AdminLessonUpsertRequest => ({
  chapterNumber: lesson.chapterNumber,
  lessonNumber: lesson.lessonNumber,
  title: lesson.title,
  description: lesson.description ?? '',
  content: normalizeLessonContentToMarkdown(lesson.content),
  estimatedMinutes: lesson.estimatedMinutes,
  retrospectivePurpose: lesson.retrospectivePurpose,
  isFree: lesson.isFree,
  isPublished: lesson.isPublished,
  tags: lesson.tags ?? [],
  biteKnowledge: lesson.biteKnowledge ?? '',
});

export const toAdminLessonHydrationSnapshot = (
  lesson: AdminLessonDetailResponse,
) =>
  JSON.stringify({
    chapterNumber: lesson.chapterNumber,
    lessonNumber: lesson.lessonNumber,
    title: lesson.title,
    description: '',
    content: normalizeMarkdownContent(lesson.content),
    estimatedMinutes: lesson.estimatedMinutes,
    retrospectivePurpose: lesson.retrospectivePurpose,
    isFree: lesson.isFree,
    isPublished: lesson.isPublished,
    tags: lesson.tags ?? [],
    biteKnowledge: lesson.biteKnowledge ?? '',
  });
