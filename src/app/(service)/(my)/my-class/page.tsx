import type { Metadata } from 'next';
import ComingSoonPage from '@/components/my-page/coming-soon-page';

export const metadata: Metadata = {
  title: '내 클래스',
};

export default function Page() {
  return <ComingSoonPage title="마이 클래스" />;
}
