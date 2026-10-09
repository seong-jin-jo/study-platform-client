'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { assertAppintossSlug } from '@/api/client/appintoss-public-api';
import ClassIntroOnly from '@/components/appintoss/class-intro-only';

function ClassDetailRoute() {
  const rawSlug = useSearchParams().get('slug') ?? '';
  let slug = '';
  try {
    slug = assertAppintossSlug(rawSlug);
  } catch {
    slug = '';
  }

  if (!slug) {
    return (
      <section className="mx-auto max-w-page px-600 py-800" role="alert">
        <h1 className="font-designer-28b text-text-strong">
          클래스 주소를 확인해 주세요
        </h1>
      </section>
    );
  }

  return <ClassIntroOnly slug={slug} />;
}

export default function AppintossClassDetailPage() {
  return (
    <Suspense>
      <ClassDetailRoute />
    </Suspense>
  );
}
