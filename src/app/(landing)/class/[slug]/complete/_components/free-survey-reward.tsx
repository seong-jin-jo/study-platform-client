'use client';

import Link from 'next/link';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { useToastStore } from '@/stores/use-toast-store';
import type { CourseCompletionRecapResponse } from '@/types/api/course.types';

interface Props {
  recap: CourseCompletionRecapResponse;
  couponCode: string | null;
  slug: string;
}

export function FreeSurveyReward({ recap, couponCode, slug }: Props) {
  const showToast = useToastStore((s) => s.showToast);

  const handleCopy = async () => {
    if (!couponCode) return;
    try {
      await navigator.clipboard.writeText(couponCode);
      showToast('쿠폰 코드가 복사되었어요!');
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto flex max-w-page flex-col items-center px-600 py-800">
        <h1 className="text-center font-designer-28b text-gray-800">
          소중한 의견 감사합니다.
        </h1>
        <p className="mt-100 text-center font-designer-28b text-gray-800">
          특별한 시크릿 혜택을 드릴게요!
        </p>

        <div className="mt-300 space-y-75 text-center font-designer-20r text-gray-800">
          <p>{recap.studyDays}일 만에 코스를 완주했어요.</p>
          <p>
            시작하기조차 막막했는데, 이제 만든 걸 보여줄 주소가 손에 있어요.
          </p>
          <p>또 만들고 싶은 게 벌써 떠오르지 않나요?</p>
        </div>

        {/* Recap stats */}
        <div className="mt-500 flex gap-200">
          {[
            {
              value: String(recap.latestCompletedLessonCount),
              label: '내가 들은 레슨 수',
            },
            { value: String(recap.studyDays), label: '일간의 여정' },
            { value: String(recap.siteUrlCount), label: '나만의 사이트 수' },
          ].map((s) => (
            <div
              key={s.label}
              className="flex h-1250 w-2125 flex-col items-center justify-center gap-25 rounded-200 border border-rose-300 bg-rose-50"
            >
              <p className="font-designer-24sb text-text-brand">{s.value}</p>
              <p className="font-designer-16m text-gray-1000">{s.label}</p>
            </div>
          ))}
        </div>

        {/* YOU'RE INVITED card */}
        <div className="mt-600 w-full max-w-10700">
          <div className="relative overflow-hidden rounded-300 border border-rose-300 bg-background-default p-600 shadow-brand-card">
            {/* Decorative background circles */}
            <div className="pointer-events-none absolute -right-400 -top-400 size-2500 rounded-full bg-rose-50 opacity-60" />
            <div className="pointer-events-none absolute -bottom-600 -left-600 size-3000 rounded-full bg-rose-50 opacity-40" />

            <div className="relative flex flex-col items-center gap-300">
              <p className="font-designer-14m uppercase tracking-widest text-text-brand">
                You&apos;re Invited
              </p>
              <p className="text-center font-designer-20b text-gray-800">
                빌더님을 위한 특별 초대장
              </p>
              <p className="text-center font-designer-16r text-gray-600">
                여러분의 피드백이 더 좋은 클래스를 만들어요.
                <br />
                감사의 마음으로 시크릿 혜택을 준비했어요!
              </p>
            </div>
          </div>
        </div>

        {/* Coupon section */}
        {couponCode !== null && (
          <div className="mt-500 w-full max-w-10700">
            <h2 className="mb-300 text-center font-designer-20b text-gray-800">
              시크릿 쿠폰 코드
            </h2>

            {/* Barcode-style banner */}
            <div className="flex items-center justify-center gap-25 overflow-hidden rounded-t-200 bg-gray-800 px-400 py-200">
              {Array.from({ length: 28 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-500 shrink-0 rounded-full bg-white',
                    i % 5 === 0 ? 'w-25' : i % 3 === 0 ? 'w-50' : 'w-[3px]',
                  )}
                />
              ))}
            </div>

            {/* Coupon code + copy */}
            <div className="flex items-center justify-between rounded-b-200 border border-t-0 border-gray-200 bg-background-default px-400 py-300">
              <p className="font-designer-20b tracking-widest text-gray-800">
                {couponCode}
              </p>
              <Button
                type="button"
                color="primary"
                size="medium"
                onClick={handleCopy}
                className="h-auto px-300 py-150 font-designer-14m transition-opacity hover:bg-background-brand-default hover:opacity-90 active:bg-background-brand-default"
              >
                복사
              </Button>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div className="mt-600 flex gap-200">
          <Link
            href={`/class/${slug}/home?tab=feed`}
            className="flex h-750 w-3875 items-center justify-center rounded-100 bg-background-brand-default font-designer-18b text-text-inverse"
          >
            빌더들의 바이브 보기
          </Link>
          <Link
            href="/my-page"
            className="flex h-750 w-3875 items-center justify-center rounded-100 border border-border-brand bg-background-default font-designer-18b text-text-brand"
          >
            내 빌더 피드 모아보기
          </Link>
        </div>
      </div>
    </div>
  );
}
