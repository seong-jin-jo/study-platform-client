import { Suspense } from 'react';
import SeminarLanding from '@/components/retention/seminar-landing';

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <Suspense>
      <SeminarLanding code={code} />
    </Suspense>
  );
}
