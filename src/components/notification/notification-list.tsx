import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Badge from '@/components/common/ui/badge';
import type { MemberNotificationWithDestination } from '@/types/api/notification.types';

const getBadgeColor = (
  topicType: string,
): 'primary' | 'green' | 'red' | 'blue' | 'orange' | 'gray' | 'purple' => {
  switch (topicType) {
    case 'ONE_ON_ONE_STUDY':
      return 'blue';
    case 'GROUP_STUDY':
      return 'purple';
    case 'PAYMENT':
      return 'green';
    case 'MENTOR_ADMITTANCE':
      return 'red';
    case 'SYSTEM':
      return 'gray';
    case 'MARKETING':
      return 'orange';
    default:
      return 'gray';
  }
};

interface NotificationListProps {
  notifications?: MemberNotificationWithDestination[];
  onNotificationClick?: (
    notification: MemberNotificationWithDestination,
  ) => void;
}

export default function NotificationList({
  notifications,
  onNotificationClick,
}: NotificationListProps) {
  return (
    <ul>
      {notifications?.map((notification, index) => (
        <li
          key={notification.id ?? index}
          data-testid={
            typeof notification.id === 'number'
              ? `notification-${notification.id}`
              : undefined
          }
          className={cn(
            'border-bottom-border-default bg-background-default flex items-center justify-between border-b py-150',
            notification.destination
              ? 'cursor-pointer hover:bg-background-neutral-subtle'
              : 'cursor-default',
            !notification.isRead && 'bg-rose-50',
          )}
          onClick={() =>
            notification.destination && onNotificationClick?.(notification)
          }
        >
          <div className="flex min-w-0 flex-1 items-center gap-150">
            <Badge
              color={getBadgeColor(notification.topicType ?? '')}
              shape="rectangle"
            >
              {notification.topicDescription}
            </Badge>
            <span className="min-w-0">
              <span
                className={cn(
                  notification.isRead
                    ? 'font-designer-13r'
                    : 'font-designer-13b',
                  'text-text-default block',
                )}
              >
                {notification.title}
              </span>
              <span className="mt-25 block font-designer-11r text-text-subtle">
                {notification.destination?.state === 'FALLBACK'
                  ? notification.destination.message
                  : (notification.content ??
                    (!notification.destination
                      ? '이 알림은 갈 곳이 없어 눌리지 않아요'
                      : undefined))}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-100">
            <span className="font-designer-11r text-text-subtlest whitespace-nowrap">
              {notification.createdAt
                ? format(notification.createdAt, 'yyyy.MM.dd HH:mm')
                : '-'}
            </span>
            {notification.destination && (
              <ChevronRight
                aria-hidden="true"
                size={16}
                className="text-text-subtlest"
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
