import type { Metadata } from 'next';
import StreakPage from '@/components/retention/streak-page';

export const metadata: Metadata = { title: '나의 스트릭 | ZERO-ONE' };

export default function Page() {
  return <StreakPage />;
}
