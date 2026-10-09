'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/common/ui/button';

export default function InsightsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-200 py-400 sm:px-300 sm:py-500 xl:px-400 xl:py-600">
      <section
        data-testid="insight-learning-map-error"
        className="border-border-subtle bg-background-default rounded-200 flex flex-col items-center gap-150 border p-400 text-center"
      >
        <div data-testid="route-error" className="contents" />
        <h1 className="font-designer-20b text-text-strong">
          학습지도를 불러오지 못했어요
        </h1>
        <p className="font-designer-14r text-text-subtle">
          예시 데이터로 바꾸지 않았어요. 잠시 후 다시 시도해 주세요.
        </p>
        <Button
          type="button"
          onClick={reset}
          size="medium"
          icon={<RefreshCw className="size-175" aria-hidden />}
          className="h-auto rounded-125 px-200 py-100 font-designer-14b"
        >
          다시 시도
        </Button>
        <Link
          href="/insights/koans"
          className="font-designer-14b inline-flex min-h-600 items-center justify-center rounded-150 border border-border-default px-300 text-text-strong"
        >
          화두 보기
        </Link>
      </section>
    </div>
  );
}
