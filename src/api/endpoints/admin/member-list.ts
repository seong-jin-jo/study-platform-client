import { axiosInstance } from '@/api/client/axios';
import {
  AdminMemberCourseStatus,
  AdminMemberNotificationSubscriptions,
} from '@/types/api/admin-insight.types';
import {
  BulkChangeMemberRoleRequest,
  BulkChangeMemberStatusRequest,
  GetMemberListRequest,
  GetMemberListResponse,
} from '@/types/api/admin.types';

// 사용자 목록 조회
export const getMemberList = async ({
  roleId,
  memberStatus,
  searchKeyword,
  page = 1,
}: GetMemberListRequest): Promise<GetMemberListResponse> => {
  // size는 10으로 고정
  let queryString = `page=${page}&size=10`;

  if (roleId) {
    queryString += `&role-id=${roleId}`;
  }
  if (memberStatus) {
    queryString += `&member-status=${memberStatus}`;
  }
  if (searchKeyword) {
    queryString += `&search-keyword=${searchKeyword}`;
  }

  const res = await axiosInstance.get(`/admin/members?${queryString}`);

  return res.data.content;
};

// 사용자 계정 상태 일괄 변경 (선택 회원 N명을 한 번의 요청으로 변경)
export const changeMemberStatuses = async ({
  memberIds,
  to,
}: BulkChangeMemberStatusRequest) => {
  const res = await axiosInstance.patch('/admin/members/statuses', {
    memberIds,
    to,
  });

  return res.data;
};

// 사용자 권한 일괄 변경 (선택 회원 N명을 한 번의 요청으로 변경)
export const changeMemberRoles = async ({
  memberIds,
  roleId,
}: BulkChangeMemberRoleRequest) => {
  const res = await axiosInstance.patch('/admin/members/roles', {
    memberIds,
    roleId,
  });

  return res.data;
};

// 회원 계정 탈퇴 처리 (관리자) — 본인 탈퇴와 동일하게 익명화. 되돌릴 수 없다.
export const withdrawMemberByAdmin = async (memberId: number) => {
  const res = await axiosInstance.post(`/admin/members/${memberId}/withdraw`);

  return res.data;
};

// 회원 수강 클래스/레슨 현황 조회 (관리자)
export const getMemberCourseStatus = async (
  memberId: number,
): Promise<AdminMemberCourseStatus[]> => {
  const res = await axiosInstance.get(
    `/admin/members/${memberId}/course-status`,
  );

  return res.data.content;
};

// 회원 알림 구독 현황 조회 (관리자)
export const getMemberNotificationSubscriptions = async (
  memberId: number,
): Promise<AdminMemberNotificationSubscriptions> => {
  const res = await axiosInstance.get(
    `/admin/members/${memberId}/notification-subscriptions`,
  );

  return res.data.content;
};
