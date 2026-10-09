import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getQaCourseProgressState,
  resetQaCourseProgress,
  seedQaCourseProgress,
  withdrawQaMember,
} from '@/api/endpoints/admin/qa-course-seed';
import type {
  QaCourseProgressSeedRequest,
  QaCourseProgressStateResponse,
  QaMemberWithdrawRequest,
  QaMemberWithdrawResponse,
} from '@/types/api/qa-seed.types';

const qaCourseSeedQueryKeys = {
  state: (courseId?: number, memberId?: number) =>
    ['qa-course-progress-state', courseId, memberId] as const,
};

// 현재 수강 상태 미리보기. course + member 가 모두 선택됐을 때만 호출.
export const useQaCourseProgressStateQuery = (
  courseId?: number,
  memberId?: number,
) =>
  useQuery({
    queryKey: qaCourseSeedQueryKeys.state(courseId, memberId),
    queryFn: () =>
      getQaCourseProgressState(courseId as number, memberId as number),
    enabled: !!courseId && !!memberId,
  });

const invalidateState = (
  queryClient: ReturnType<typeof useQueryClient>,
  variables: { courseId: number; memberId: number },
) =>
  queryClient.invalidateQueries({
    queryKey: qaCourseSeedQueryKeys.state(
      variables.courseId,
      variables.memberId,
    ),
  });

export const useSeedQaCourseProgressMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    QaCourseProgressStateResponse,
    unknown,
    QaCourseProgressSeedRequest
  >({
    mutationFn: (request) => seedQaCourseProgress(request),
    onSuccess: async (_data, variables) => {
      await invalidateState(queryClient, variables);
    },
  });
};

export const useResetQaCourseProgressMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    QaCourseProgressStateResponse,
    unknown,
    { courseId: number; memberId: number }
  >({
    mutationFn: (request) => resetQaCourseProgress(request),
    onSuccess: async (_data, variables) => {
      await invalidateState(queryClient, variables);
    },
  });
};

// 선택한 회원을 실제 계정 탈퇴(익명화) 처리. 되돌릴 수 없으므로 호출 측에서 확인을 받는다.
export const useWithdrawQaMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    QaMemberWithdrawResponse,
    unknown,
    QaMemberWithdrawRequest
  >({
    mutationFn: (request) => withdrawQaMember(request),
    onSuccess: async () => {
      // 탈퇴 후 회원 목록에서 사라지므로 목록 캐시를 무효화한다.
      await queryClient.invalidateQueries({ queryKey: ['memberList'] });
    },
  });
};
