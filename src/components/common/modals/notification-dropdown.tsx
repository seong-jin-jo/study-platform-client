'use client';

import { Bell, ChevronRight, MessageCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/common/ui/(shadcn)/ui/dropdown-menu';
import TextActionButton from '@/components/common/ui/text-action-button';
import {
  useGetNotifications,
  useReadNotifications,
} from '@/hooks/queries/user/notification-queries';
import type { MemberNotificationWithDestination } from '@/types/api/notification.types';
import { getNotificationDestinationPath } from '@/types/api/notification.types';

export default function NotificationDropdown() {
  const { data } = useGetNotifications({ page: 1, size: 4 });
  const { data: unreadData } = useGetNotifications({
    page: 1,
    size: 1,
    hasRead: false,
  });
  const { mutate: readNotifications } = useReadNotifications();
  const notifications = data?.content ?? [];
  const unreadCount = unreadData?.totalElements ?? 0;

  const markAsRead = (notification: MemberNotificationWithDestination) => {
    if (!notification.isRead && typeof notification.id === 'number') {
      readNotifications([notification.id]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={
          unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '알림'
        }
        className="relative flex size-500 items-center justify-center rounded-full text-text-subtle hover:bg-background-neutral-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-brand"
      >
        <Bell aria-hidden="true" size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex min-h-200 min-w-200 items-center justify-center rounded-full bg-rose-500 px-50 font-designer-10b text-text-inverse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-200 border border-border-subtle bg-background-default p-0 shadow-2"
      >
        <div className="flex min-h-600 items-center justify-between border-b border-border-subtle px-250">
          <strong className="font-designer-15b text-text-strong">알림</strong>
          <TextActionButton
            type="button"
            onClick={() => readNotifications(undefined)}
            weight="bold"
            className="min-h-550 border-0 px-100 py-0 font-designer-12b text-text-brand"
          >
            모두 읽음
          </TextActionButton>
        </div>

        <div className="max-h-5000 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-250 py-500 text-center">
              <p className="font-designer-14b text-text-default">
                아직 새 소식이 없어요
              </p>
            </div>
          ) : (
            notifications.map((notification, index) => {
              const destinationPath =
                getNotificationDestinationPath(notification);
              const itemClassName = cn(
                'flex min-h-800 w-full items-center gap-150 border-b border-border-subtle px-200 py-150 text-left',
                !notification.isRead && 'bg-rose-50',
                destinationPath
                  ? 'hover:bg-background-neutral-subtle'
                  : 'cursor-default',
              );
              const content = (
                <>
                  <span className="flex size-400 shrink-0 items-center justify-center rounded-full bg-background-brand-default text-text-brand">
                    {String(notification.topicType) === 'COMMUNITY_ROOM' ? (
                      <Users aria-hidden="true" size={17} />
                    ) : (
                      <MessageCircle aria-hidden="true" size={17} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-designer-13b text-text-default">
                      {notification.title}
                    </span>
                    <span className="mt-25 line-clamp-2 block font-designer-11r text-text-subtle">
                      {notification.destination?.state === 'FALLBACK'
                        ? notification.destination.message
                        : (notification.content ??
                          (!notification.destination
                            ? '이 알림은 갈 곳이 없어 눌리지 않아요'
                            : ''))}
                    </span>
                  </span>
                  {destinationPath && (
                    <ChevronRight
                      aria-hidden="true"
                      size={16}
                      className="shrink-0 text-text-subtlest"
                    />
                  )}
                </>
              );

              return destinationPath ? (
                <Link
                  key={notification.id ?? index}
                  href={destinationPath}
                  onClick={() => markAsRead(notification)}
                  className={itemClassName}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={notification.id ?? index}
                  aria-disabled="true"
                  className={itemClassName}
                >
                  {content}
                </div>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-2 border-t border-border-subtle">
          <Link
            href="/notification/settings"
            className="flex min-h-550 items-center justify-center border-r border-border-subtle font-designer-12b text-text-subtle"
          >
            알림 설정
          </Link>
          <Link
            href="/notification"
            className="flex min-h-550 items-center justify-center font-designer-12b text-text-subtle"
          >
            전체 보기
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
