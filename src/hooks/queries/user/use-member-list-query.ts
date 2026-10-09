import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changeMemberRoles,
  changeMemberStatuses,
  getMemberList,
  withdrawMemberByAdmin,
} from '@/api/endpoints/admin/member-list';
import {
  ChangeMemberRoleRequest,
  ChangeMemberStatusRequest,
  GetMemberListRequest,
  GetMemberListResponse,
} from '@/types/api/admin.types';

// 사용자 목록 조회
export const useGetMemberListQuery = ({
  roleId,
  memberStatus,
  searchKeyword,
  page = 1,
}: GetMemberListRequest) => {
  return useQuery({
    queryKey: ['memberList', roleId, memberStatus, searchKeyword, page],
    queryFn: () =>
      getMemberList({
        roleId,
        memberStatus,
        searchKeyword,
        page,
      }),
  });
};

// 사용자 계정 상태 변경 (선택 회원 N명을 1회 요청으로 일괄 변경)
export const useChangeMemberStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      members: GetMemberListResponse['content'];
      to: ChangeMemberStatusRequest['to'];
    }) =>
      changeMemberStatuses({
        memberIds: data.members.map((member) => member.memberId),
        to: data.to,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['memberList'] });
    },
  });
};

// 사용자 권한 변경 (선택 회원 N명을 1회 요청으로 일괄 변경)
export const useChangeMemberRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      members: GetMemberListResponse['content'];
      roleId: ChangeMemberRoleRequest['roleId'];
    }) =>
      changeMemberRoles({
        memberIds: data.members.map((member) => member.memberId),
        roleId: data.roleId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['memberList'] });
    },
  });
};

// 회원 계정 탈퇴 처리 (관리자). 성공 시 회원 목록 무효화.
export const useWithdrawMemberByAdminMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<unknown, unknown, number>({
    mutationFn: (memberId) => withdrawMemberByAdmin(memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['memberList'] });
    },
  });
};
