import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstanceV6 } from '@/api/client/axios';
import { createApiInstance } from '@/api/client/open-api-instance';
import { MyClassProfileApi } from '@/api/openapi';
import { MyClassProfilePatchRequest } from '@/api/openapi/models/my-class-profile-patch-request';
import { useAuthReady } from '@/features/auth/model/use-auth';

const myClassProfileApi = createApiInstance(MyClassProfileApi);

// 이메일 본인인증 엔드포인트는 생성된 OpenAPI 클라이언트가 아직 포함하지 않으므로
// (스펙 재생성 전까지) axiosInstanceV6 로 직접 호출한다.
export interface MyClassProfileEmailVerificationCodeRequest {
  email: string;
}

export interface MyClassProfileEmailVerificationRequest {
  email: string;
  code: string;
}

export interface MyClassProfileEmailVerificationResponse {
  email: string;
  verificationCodeSent: boolean;
  emailUpdated: boolean;
  verificationCodeExpiresAt: string | null;
}

export const useMyClassProfileQuery = () => {
  const { isAuthReady } = useAuthReady();

  return useQuery({
    queryKey: ['myClassProfile'],
    queryFn: async () => {
      const { data } = await myClassProfileApi.getMyClassProfile();
      if (data.content === undefined)
        throw new Error('content missing in response');
      return data.content;
    },
    enabled: isAuthReady,
  });
};

export const usePatchMyClassProfileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MyClassProfilePatchRequest) => {
      const { data } = await myClassProfileApi.patchMyClassProfile(request);
      return data.content;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['myClassProfile'],
      });
    },
  });
};

/**
 * 이메일 인증번호 발송 Mutation
 */
export const useSendMyClassProfileEmailVerificationCodeMutation = () => {
  return useMutation({
    mutationFn: async (
      request: MyClassProfileEmailVerificationCodeRequest,
    ): Promise<MyClassProfileEmailVerificationResponse> => {
      const { data } = await axiosInstanceV6.post<{
        content: MyClassProfileEmailVerificationResponse;
      }>('mypage/class/profile/email-verification-code', request);

      return data.content;
    },
  });
};

/**
 * 이메일 인증번호 검증 Mutation
 * 인증 성공 시 프로필 쿼리를 무효화하여 갱신된 이메일을 반영한다.
 */
export const useVerifyMyClassProfileEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: MyClassProfileEmailVerificationRequest,
    ): Promise<MyClassProfileEmailVerificationResponse> => {
      const { data } = await axiosInstanceV6.post<{
        content: MyClassProfileEmailVerificationResponse;
      }>('mypage/class/profile/email-verification', request);

      return data.content;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['myClassProfile'],
      });
    },
  });
};
