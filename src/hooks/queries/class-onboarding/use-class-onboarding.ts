import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiInstance } from '@/api/client/open-api-instance';
import { unwrapContent } from '@/api/client/unwrap-content';
import type {
  ClassOnboardingStep1Request,
  ClassOnboardingStep2Request,
  ClassOnboardingStep3Request,
} from '@/api/openapi';
import { ClassOnboardingApi } from '@/api/openapi';

const classOnboardingApi = createApiInstance(ClassOnboardingApi);

const ONBOARDING_STATUS_KEY = ['classOnboardingStatus'] as const;

/**
 * 클래스 온보딩 진행 상태 조회 (GET /api/v6/class-onboarding/me)
 * 모달 진입 시 lastSavedStep/저장값을 읽어 재개에 사용.
 * 항상 최신 진행도를 받아야 하므로 staleTime:0.
 */
export const useClassOnboardingStatusQuery = (enabled = true) => {
  return useQuery({
    queryKey: ONBOARDING_STATUS_KEY,
    queryFn: async () => {
      const { data } = await classOnboardingApi.getMyOnboardingStatus();
      return unwrapContent(data);
    },
    enabled,
    staleTime: 0,
    retry: false,
  });
};

// 백엔드 step1 은 profileImageNumber(1~8, 선택)를 받는다. 생성된 OpenAPI 타입에
// 아직 반영되기 전이라 여기서 확장한다(다음 OpenAPI 재생성 시 동일 필드로 수렴).
export type ClassOnboardingStep1RequestWithProfile =
  ClassOnboardingStep1Request & {
    profileImageNumber?: number;
  };

/** Step1 저장 (닉네임 + 랜덤 프사 + 약관 동의 + 입문 수준) */
export const useSaveStep1Mutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: ClassOnboardingStep1RequestWithProfile) => {
      const { data } = await classOnboardingApi.saveStep1(request);
      return unwrapContent(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
    },
  });
};

/** Step2 저장 (직무 다중 + 경력) */
export const useSaveStep2Mutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: ClassOnboardingStep2Request) => {
      const { data } = await classOnboardingApi.saveStep2(request);
      return unwrapContent(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
    },
  });
};

/** Step3 저장 (관심 분야) */
export const useSaveStep3Mutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: ClassOnboardingStep3Request) => {
      const { data } = await classOnboardingApi.saveStep3(request);
      return unwrapContent(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
    },
  });
};

/** 온보딩 완료 확정 (POST /api/v6/class-onboarding/me/complete) */
export const useCompleteOnboardingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await classOnboardingApi.complete({
        confirmedOnboardingCompletion: true,
      });
      return unwrapContent(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ONBOARDING_STATUS_KEY });
    },
  });
};
