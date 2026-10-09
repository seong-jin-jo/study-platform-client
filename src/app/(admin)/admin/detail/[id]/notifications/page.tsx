import MemberNotificationSubscriptionsView from '@/components/admin/member-notification-subscriptions-view';

export default async function MemberNotificationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: memberId } = await params;

  return (
    <div className="border-border-default rounded-100 border p-400">
      <h2 className="font-designer-18b text-text-default mb-300">알림 구독</h2>
      <MemberNotificationSubscriptionsView memberId={Number(memberId)} />
    </div>
  );
}
