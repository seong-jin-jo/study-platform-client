import type { Metadata } from 'next';
import NotificationSettingsPage from './page-client';

export const metadata: Metadata = { title: '알림 설정' };

export default function Page() {
  return <NotificationSettingsPage />;
}
