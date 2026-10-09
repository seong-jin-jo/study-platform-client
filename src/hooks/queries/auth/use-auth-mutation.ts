// 데이터 변경(Mutation) 을 담당하는 커스텀 훅

import { sendGTMEvent } from '@next/third-parties/google';
import { useMutation } from '@tanstack/react-query';
import { axiosInstanceForMultipart } from '@/api/client/axios';
import { logout } from '@/api/endpoints/auth/auth';
import { AUTH_ROUTE_PATHS } from '@/features/auth/model/auth-route';
import { clearClientAuthStateAndRedirect } from '@/features/auth/model/client-auth-cleanup';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { hashValue } from '@/utils/hash';

// 프로필 이미지 업로드 요청 커스텀 훅
export function useUploadProfileImageMutation() {
  return useMutation({
    mutationFn: ({ uploadUrl, file }: { uploadUrl: string; file: FormData }) =>
      axiosInstanceForMultipart.put(uploadUrl, file).then((r) => r.data),
  });
}

const finishLogout = (): void => {
  clearClientAuthStateAndRedirect(AUTH_ROUTE_PATHS.LANDING);
};

export const useLogoutMutation = () => {
  const { memberId } = useAuthReady();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      if (memberId)
        sendGTMEvent({
          event: 'custom_member_logout',
          dl_timestamp: new Date().toISOString(),
          dl_member_id: hashValue(String(memberId)),
        });

      finishLogout();
    },
    onError: () => {
      finishLogout();
    },
  });
};
