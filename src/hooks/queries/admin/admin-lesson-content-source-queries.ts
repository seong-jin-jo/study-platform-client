import { useMutation } from '@tanstack/react-query';
import { axiosInstanceV5 } from '@/api/client/axios';

interface ApiBaseResponse<T> {
  content: T;
}

/**
 * 레포 SSOT 레슨 본문 커밋 응답.
 * `PUT /api/v5/admin/lessons/{lessonId}/content/source` 가
 * `BaseResponse<{ committed, sha, path }>` 로 감싸 응답한다.
 */
export interface AdminLessonContentSourceCommitResponse {
  committed: boolean;
  sha: string;
  path: string;
}

interface CommitAdminLessonContentSourceParams {
  lessonId: number;
  markdown: string;
}

/**
 * 레슨 본문 마크다운 원본을 콘텐츠 레포에 커밋한다.
 *
 * 이 요청은 레포에 커밋만 하고, 이후 웹훅이 DB를 동기화한다.
 * 따라서 이 페이지의 DB 기반 쿼리(`lessonDetail`)는 즉시 갱신되지 않으므로
 * onSuccess 에서 쿼리를 낙관적으로 무효화/변경하지 않는다.
 */
export const useCommitAdminLessonContentSource = () => {
  return useMutation({
    mutationFn: async ({
      lessonId,
      markdown,
    }: CommitAdminLessonContentSourceParams) => {
      const { data } = await axiosInstanceV5.put<
        ApiBaseResponse<AdminLessonContentSourceCommitResponse>
      >(`admin/lessons/${lessonId}/content/source`, { markdown });

      return data.content;
    },
  });
};
