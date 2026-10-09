import { useQuery } from '@tanstack/react-query';
import {
  getMemberCourseStatus,
  getMemberNotificationSubscriptions,
} from '@/api/endpoints/admin/member-list';

// 회원 수강 클래스/레슨 현황
export const useMemberCourseStatusQuery = (memberId: number) =>
  useQuery({
    queryKey: ['memberCourseStatus', memberId],
    queryFn: () => getMemberCourseStatus(memberId),
    enabled: Number.isFinite(memberId) && memberId > 0,
  });

// 회원 알림 구독 현황
export const useMemberNotificationSubscriptionsQuery = (memberId: number) =>
  useQuery({
    queryKey: ['memberNotificationSubscriptions', memberId],
    queryFn: () => getMemberNotificationSubscriptions(memberId),
    enabled: Number.isFinite(memberId) && memberId > 0,
  });
