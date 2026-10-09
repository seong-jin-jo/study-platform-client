'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { GetMemberNotificationsTopicTypeEnum } from '@/api/openapi/api/notification-api';
import Button from '@/components/common/ui/button';
import SingleDropdown from '@/components/common/ui/dropdown/single';
import Pagination from '@/components/common/ui/pagination';
import NotificationList from '@/components/notification/notification-list';
import {
  useGetNotifications,
  useGetNotificationCategories,
  useReadNotifications,
} from '@/hooks/queries/user/notification-queries';
import type { MemberNotificationWithDestination } from '@/types/api/notification.types';
import { getNotificationDestinationPath } from '@/types/api/notification.types';
import NotificationIcon from 'public/images/notification.svg';

const READ_STATUS_OPTIONS = [
  { value: 'all', label: '상태 전체' },
  { value: 'read', label: '읽음' },
  { value: 'unread', label: '안 읽음' },
];

export default function NotificationPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<
    GetMemberNotificationsTopicTypeEnum | undefined
  >(undefined);
  const [readStatus, setReadStatus] = useState<'all' | 'read' | 'unread'>(
    'all',
  );

  const PAGE_SIZE = 10;
  const {
    data: notificationsData,
    isError,
    isLoading,
    refetch,
  } = useGetNotifications({
    page,
    size: PAGE_SIZE,
    hasRead: readStatus === 'all' ? undefined : readStatus === 'read',
    topicType: category,
  });
  const { data: categoriesData } = useGetNotificationCategories();

  const notifications = notificationsData?.content ?? [];
  const categories = categoriesData?.notificationCategories || [];

  const { mutate: readNotifications } = useReadNotifications();

  const categoryOptions = [
    { value: '', label: '카테고리 전체' },
    ...categories
      .map((category) => ({
        value: category.name,
        label: category.description,
      }))
      .filter(
        (o): o is { value: string; label: string } =>
          o.value !== undefined && o.label !== undefined,
      ),
  ];

  const handleCategoryChange = (value: string | undefined) => {
    setCategory(
      value ? (value as GetMemberNotificationsTopicTypeEnum) : undefined,
    );
    setPage(1);
  };

  const handleMarkAllAsRead = () => {
    const ids = notifications
      .map((notification) => notification.id)
      .filter((id): id is number => typeof id === 'number');

    readNotifications(ids);
  };

  const handleNotificationClick = (
    notification: MemberNotificationWithDestination,
  ) => {
    if (!notification.isRead && typeof notification.id === 'number') {
      readNotifications([notification.id]);
    }
    const destinationPath = getNotificationDestinationPath(notification);
    if (destinationPath) {
      router.push(destinationPath);
    }
  };

  return (
    <div className="flex flex-col gap-300">
      {/* Header */}
      <div className="flex items-center gap-75">
        <NotificationIcon />
        <h1 className="font-designer-24b text-text-default">알림</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-1750">
          <SingleDropdown
            size="s"
            options={categoryOptions}
            value={category ?? ''}
            onChange={handleCategoryChange}
            placeholder="카테고리 전체"
          />
        </div>
        <div className="flex gap-100">
          <Button
            color="outlined"
            className="font-designer-13r h-400"
            disabled={notifications.length === 0}
            onClick={handleMarkAllAsRead}
          >
            모두 읽음 처리
          </Button>

          <div className="w-1500">
            <SingleDropdown
              size="s"
              options={READ_STATUS_OPTIONS}
              value={readStatus}
              onChange={(value) => {
                setReadStatus(value as 'all' | 'read' | 'unread');
                setPage(1);
              }}
              placeholder="상태 전체"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p
          className="font-designer-14m text-text-subtle py-425 text-center"
          role="status"
        >
          알림을 불러오는 중...
        </p>
      ) : isError ? (
        <section
          role="alert"
          className="border-border-subtle bg-background-default rounded-200 flex flex-col items-center border p-400 text-center"
        >
          <h2 className="font-designer-18b text-text-strong">
            알림을 못 불러왔어요
          </h2>
          <p className="font-designer-13r text-text-subtle mt-100 leading-relaxed">
            잠깐 문제가 생겼어요. 읽음 표시는 그대로입니다.
          </p>
          <Button
            type="button"
            color="outlined"
            size="medium"
            className="mt-200"
            onClick={() => refetch()}
          >
            다시 시도
          </Button>
        </section>
      ) : notifications.length === 0 ? (
        <section
          data-testid="notification-empty"
          className="border-border-subtle bg-background-default rounded-200 flex flex-col items-center border p-425 text-center"
        >
          <h2 className="font-designer-18b text-text-strong">
            아직 온 알림이 없어요
          </h2>
          <p className="font-designer-13r text-text-subtle mt-100 leading-relaxed">
            내 글에 답이 달리거나 방에 새 글이 올라오면 여기로 알려드려요.
            <br />
            어떤 알림을 받을지는 아래에서 고를 수 있어요.
          </p>
          <Button asChild color="primary" size="medium" className="mt-200">
            <Link href="/notification/settings">알림 설정 열기</Link>
          </Button>
        </section>
      ) : (
        <NotificationList
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
        />
      )}

      {/* Pagination */}
      {notifications.length > 0 && (
        <div className="mt-200">
          <Pagination
            page={page}
            totalPages={notificationsData?.totalPages ?? 1}
            onChangePage={setPage}
          />
        </div>
      )}
    </div>
  );
}
