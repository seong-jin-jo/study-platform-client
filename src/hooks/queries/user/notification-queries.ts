import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiInstance } from '@/api/client/open-api-instance';
import { NotificationApi } from '@/api/openapi';
import type { GetMemberNotificationsTopicTypeEnum } from '@/api/openapi/api/notification-api';
import { useAuthReady } from '@/features/auth/model/use-auth';
import {
  parseNotificationDestination,
  type MemberNotificationWithDestination,
} from '@/types/api/notification.types';

const notificationApi = createApiInstance(NotificationApi);

interface NotificationsParams {
  page?: number;
  size?: number;
  hasRead?: boolean;
  topicType?: GetMemberNotificationsTopicTypeEnum;
}

export const useGetNotifications = ({
  page = 1,
  size = 10,
  hasRead,
  topicType,
}: NotificationsParams = {}) => {
  const { isAuthReady } = useAuthReady();

  return useQuery({
    queryKey: ['notifications', page, size, hasRead, topicType],
    queryFn: async () => {
      const { data } = await notificationApi.getMemberNotifications(
        page,
        size,
        hasRead,
        topicType,
      );

      if (data.content === undefined)
        throw new Error('content missing in response');
      return {
        ...data.content,
        content: (data.content.content ?? []).map((notification) => {
          const destination =
            'destination' in notification
              ? parseNotificationDestination(notification.destination)
              : undefined;
          const mapped: MemberNotificationWithDestination = {
            ...notification,
            destination,
          };
          return mapped;
        }),
      };
    },
    refetchInterval: 60000, // 1 minute
    enabled: isAuthReady,
  });
};

export const useGetNotificationCategories = () => {
  const { isAuthReady } = useAuthReady();

  return useQuery({
    queryKey: ['notificationCategories'],
    queryFn: async () => {
      const { data } = await notificationApi.getMemberNotificationCategories();

      if (data.content === undefined)
        throw new Error('content missing in response');
      return data.content;
    },
    enabled: isAuthReady,
  });
};

export const useHasNewNotification = () => {
  const { isAuthReady } = useAuthReady();

  return useQuery({
    queryKey: ['hasNewNotification'],
    queryFn: async () => {
      const { data } = await notificationApi.hasMemberNewNotification();

      if (data.content === undefined)
        throw new Error('content missing in response');
      return data.content;
    },
    refetchInterval: 60000, // 1 minute
    enabled: isAuthReady,
  });
};

export const useReadNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids?: number[]) => {
      await notificationApi.readMemberNotifications(ids);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        queryClient.invalidateQueries({
          queryKey: ['hasNewNotification'],
        }),
      ]);
    },
  });
};

export const useDeleteNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids?: number[]) => {
      await notificationApi.deleteMemberNotifications(ids);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        queryClient.invalidateQueries({
          queryKey: ['hasNewNotification'],
        }),
      ]);
    },
  });
};
