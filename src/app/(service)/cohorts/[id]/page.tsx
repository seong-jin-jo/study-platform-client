import type { Metadata } from 'next';
import CohortSpace from '@/components/retention/cohort-space';

export const metadata: Metadata = { title: '목표 방 | ZERO-ONE' };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CohortSpace cohortId={Number(id)} />;
}
