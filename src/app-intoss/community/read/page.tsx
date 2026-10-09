'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { assertAppintossPositiveId } from '@/api/client/appintoss-public-api';
import CommunityReadOnly from '@/components/appintoss/community-read-only';

function CommunityReadRoute() {
  const rawPostId = useSearchParams().get('postId');
  let postId = 0;
  try {
    postId = rawPostId ? assertAppintossPositiveId(rawPostId) : 0;
  } catch {
    postId = 0;
  }

  return <CommunityReadOnly postId={postId} />;
}

export default function AppintossCommunityReadPage() {
  return (
    <Suspense>
      <CommunityReadRoute />
    </Suspense>
  );
}
