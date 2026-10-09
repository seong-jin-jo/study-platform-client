'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { CourseCheckoutForm } from '@/components/class/payment/checkout-form';
import { PlanSelectionModal } from '@/components/class/plan-selection-modal';
import { useGetCourseDetail } from '@/hooks/queries/course/course-queries';

// 플랜 코드 비교용 정규화: 대소문자·하이픈/언더스코어 차이를 흡수한다.
const normalizePlanCode = (code: string): string =>
  code.replace(/-/g, '_').toUpperCase();

export default function VibeIntroPaymentPage() {
  return (
    <Suspense fallback={null}>
      <VibeIntroPaymentPageContent />
    </Suspense>
  );
}

function VibeIntroPaymentPageContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const requestedPlanCode = searchParams.get('planCode') ?? '';

  const [showPlanModal, setShowPlanModal] = useState(false);

  const { data: course, isLoading: courseLoading } = useGetCourseDetail(slug);
  const courseId = course?.courseId ?? 0;

  // 플랜 코드는 코스마다 다른 문자열이므로, 하드코딩된 코드 목록으로 거르지 않고
  // URL 의 planCode 를 코스의 실제 플랜 목록에 직접 매칭한다.
  // 매칭이 안 되면(링크 누락/오타) 코스의 첫 플랜으로 폴백한다.
  const plans = course?.plans ?? [];
  const plan =
    plans.find(
      (p) =>
        normalizePlanCode(p.planCode) === normalizePlanCode(requestedPlanCode),
    ) ?? plans[0];

  if (courseLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-designer-16r text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!plan || !courseId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-designer-16r text-gray-500">
          결제 정보를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-gray-300 py-400 text-center">
        <h1 className="font-designer-20b text-gray-800">결제하기</h1>
      </div>

      <CourseCheckoutForm
        slug={slug}
        plan={plan}
        courseId={courseId}
        planCode={plan.planCode}
        onChangePlan={() => setShowPlanModal(true)}
        thumbnailUrl={course?.thumbnailUrl ?? null}
      />

      {showPlanModal && (
        <PlanSelectionModal
          plan={plan}
          earlyBirdEndsAt={course?.earlyBirdEndsAt ?? null}
          onClose={() => setShowPlanModal(false)}
          slug={slug}
        />
      )}
    </>
  );
}
