'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { assertAppintossPositiveId } from '@/api/client/appintoss-public-api';
import InsightReadOnly from '@/components/appintoss/insight-read-only';

function InsightReadRoute() {
  const searchParams = useSearchParams();
  const kind = searchParams.get('kind') ?? undefined;
  const rawId = searchParams.get('id');
  let id: number | undefined;
  try {
    id = rawId ? assertAppintossPositiveId(rawId) : undefined;
  } catch {
    id = undefined;
  }

  return (
    <InsightReadOnly
      id={id}
      kind={kind}
      slug={searchParams.get('slug') ?? undefined}
    />
  );
}

export default function AppintossInsightReadPage() {
  return (
    <Suspense>
      <InsightReadRoute />
    </Suspense>
  );
}
