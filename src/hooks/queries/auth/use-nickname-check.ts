import { useQuery } from '@tanstack/react-query';
import { createApiInstance } from '@/api/client/open-api-instance';
import { MemberProfileApi } from '@/api/openapi';
import {
  isValidNicknameFormat,
  normalizeNicknameInput,
} from '@/utils/nickname-policy';

const memberProfileApi = createApiInstance(MemberProfileApi);

/**
 * 닉네임 중복 체크 Query
 * debounce된 닉네임 값과 함께 사용해야 합니다.
 */
export const useNicknameCheckQuery = (nickname: string, enabled: boolean) => {
  const normalizedNickname = normalizeNicknameInput(nickname);

  return useQuery({
    queryKey: ['nicknameCheck', normalizedNickname],
    queryFn: async () => {
      const { data } =
        await memberProfileApi.checkNicknameAvailability(normalizedNickname);

      if (data.content === undefined)
        throw new Error('content missing in response');
      return data.content;
    },
    enabled: enabled && isValidNicknameFormat(normalizedNickname),
    staleTime: 0, // 항상 최신 데이터 확인
    retry: false, // 중복 체크는 실패해도 재시도하지 않음
  });
};
