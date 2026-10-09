import type { Metadata } from 'next';
import ComingSoonPage from '@/components/my-page/coming-soon-page';

export const metadata: Metadata = {
  title: '클래스 결제 관리',
};

export default function Page() {
  return <ComingSoonPage title="결제 관리" />;
}
