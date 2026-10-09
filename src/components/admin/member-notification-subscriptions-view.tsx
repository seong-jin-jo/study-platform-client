'use client';

import { useMemberNotificationSubscriptionsQuery } from '@/hooks/queries/admin/member-insight-queries';
import type { AdminMemberCourseSubscriptionItem } from '@/types/api/admin-insight.types';

const pad2 = (value: number) => String(value).padStart(2, '0');

export default function MemberNotificationSubscriptionsView({
  memberId,
}: {
  memberId: number;
}) {
  const { data, isLoading, isError } =
    useMemberNotificationSubscriptionsQuery(memberId);

  if (isLoading) {
    return (
      <p className="font-designer-14r text-text-subtle">
        알림 구독 현황을 불러오는 중입니다.
      </p>
    );
  }
  if (isError || !data) {
    return (
      <p className="font-designer-14r text-text-error">
        알림 구독 현황을 불러오지 못했습니다.
      </p>
    );
  }

  const { lessonReminder, studyWithMe, openAlert } = data;
  const reminderText =
    lessonReminder.hasSetting &&
    lessonReminder.notifyHour !== null &&
    lessonReminder.notifyMinute !== null
      ? `매일 ${pad2(lessonReminder.notifyHour)}:${pad2(lessonReminder.notifyMinute)} 수신`
      : '미설정 (기본 시각)';

  return (
    <div className="flex flex-col gap-300">
      <Section title="레슨 리마인더 알림톡">
        <span className="font-designer-14m text-text-default">
          {reminderText}
        </span>
      </Section>

      <Section title="함께 공부해요 구독">
        <SubscriptionList
          items={studyWithMe}
          emptyText="구독 내역이 없습니다."
        />
      </Section>

      <Section title="오픈 알림 구독 (이메일 매칭)">
        <SubscriptionList items={openAlert} emptyText="구독 내역이 없습니다." />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border-default rounded-100 flex flex-col gap-100 border p-300">
      <span className="font-designer-13m text-text-subtle">{title}</span>
      {children}
    </div>
  );
}

function SubscriptionList({
  items,
  emptyText,
}: {
  items: AdminMemberCourseSubscriptionItem[];
  emptyText: string;
}) {
  if (!items.length) {
    return (
      <span className="font-designer-14r text-text-subtle">{emptyText}</span>
    );
  }
  return (
    <ul className="flex flex-col gap-75">
      {items.map((item, index) => (
        <li
          key={`${item.courseId}-${index}`}
          className="flex flex-wrap items-center gap-100"
        >
          <span className="font-designer-14m text-text-default">
            {item.courseTitle}
          </span>
          <span className="font-designer-13r text-text-subtle">
            {item.contact}
          </span>
        </li>
      ))}
    </ul>
  );
}
