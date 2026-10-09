import SurfacePanel from '@/components/common/ui/surface-panel';
import Link from 'next/link';

export default function InsightsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-200 py-400 sm:px-300 sm:py-500 xl:px-400 xl:py-600">
      <SurfacePanel
        as="section"
        radius="lg"
        className="p-300"
        aria-label="학습지도를 불러오는 중"
      >
        <div className="bg-background-disabled h-250 w-1/3 animate-pulse rounded-100" />
        <div className="mt-200 grid gap-100 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="bg-background-disabled h-2400 animate-pulse rounded-150"
            />
          ))}
        </div>
        <Link
          href="/insights/koans"
          className="font-designer-14b mt-300 inline-flex min-h-600 items-center justify-center rounded-150 border border-border-default px-300 text-text-strong"
        >
          기다리지 않고 화두 보기
        </Link>
      </SurfacePanel>
    </div>
  );
}
