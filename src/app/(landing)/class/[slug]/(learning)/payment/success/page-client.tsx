'use client';

import { sendGTMEvent } from '@next/third-parties/google';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { CoursePaymentPending } from '@/components/class/payment/payment-pending';
import { CoursePaymentSuccess } from '@/components/class/payment/payment-success';
import Button from '@/components/common/ui/button';
import {
  useCancelCoursePayment,
  useConfirmCourseTossPayment,
  useGetCourseDetail,
} from '@/hooks/queries/course/course-queries';
import type { CoursePaymentConfirmResponse } from '@/types/api/course.types';
import { getAttributionParams } from '@/utils/attribution-tracker';
import { analyzeError } from '@/utils/error-handler';

const PaymentSuccessParamsSchema = z.object({
  paymentId: z.coerce.number().int().positive(),
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
});

function SuccessContent() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get('method');
  const isFreeCoupon = method === 'FREE_COUPON';

  const parsed = PaymentSuccessParamsSchema.safeParse({
    paymentId: searchParams.get('paymentId'),
    paymentKey: searchParams.get('paymentKey'),
    orderId: searchParams.get('orderId'),
    amount: searchParams.get('amount'),
  });

  const isParamValid = parsed.success;
  const freePaymentId = z.coerce
    .number()
    .int()
    .positive()
    .safeParse(searchParams.get('paymentId'));
  const parsedPaymentId = parsed.success
    ? parsed.data.paymentId
    : freePaymentId.success
      ? freePaymentId.data
      : null;
  const parsedPaymentKey = parsed.success ? parsed.data.paymentKey : null;
  const parsedOrderId = parsed.success ? parsed.data.orderId : null;
  const parsedAmount = parsed.success ? parsed.data.amount : null;

  const [status, setStatus] = useState<
    'loading' | 'success' | 'error' | 'already-confirmed'
  >('loading');
  const [confirmData, setConfirmData] =
    useState<CoursePaymentConfirmResponse | null>(null);

  const { data: course, isLoading: isCourseLoading } = useGetCourseDetail(slug);
  const courseId = course?.courseId ?? 0;
  const { mutateAsync: confirmPayment } = useConfirmCourseTossPayment();
  const { mutate: cancelPayment, isPending: isCanceling } =
    useCancelCoursePayment();
  const hasCalledRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleCancel = () => {
    if (!courseId || !parsedPaymentId) {
      router.push(`/class/${slug}/home`);
      return;
    }
    cancelPayment(
      { courseId, paymentId: parsedPaymentId },
      {
        onSuccess: () => router.push(`/class/${slug}/home`),
      },
    );
  };

  // Toss 승인은 됐지만 confirm 호출이 일시 실패(네트워크 등)하면 결제는 됐는데
  // 수강권이 안 잡히는 "되다 만" 상태가 된다. 같은 paymentKey 로 다시 confirm 하면
  // Toss 가 멱등 처리하므로 이중 청구 없이 안전하게 복구할 수 있다 — mount 시 1회,
  // 실패 시 "다시 시도" 버튼에서 재호출한다(아래 handleRetry).
  const runConfirm = useCallback(async () => {
    if (isCourseLoading) return;
    if (isFreeCoupon) {
      if (!parsedPaymentId) {
        setStatus('error');
        return;
      }
      if (hasCalledRef.current) return;
      hasCalledRef.current = true;
      const stored = sessionStorage.getItem(
        `course-free-payment:${parsedPaymentId}`,
      );
      if (!stored) {
        setStatus('error');
        return;
      }
      try {
        setConfirmData(JSON.parse(stored) as CoursePaymentConfirmResponse);
        sessionStorage.removeItem(`course-free-payment:${parsedPaymentId}`);
        setStatus('success');
      } catch {
        setStatus('error');
      }
      return;
    }
    if (
      !isParamValid ||
      !parsedPaymentId ||
      !parsedPaymentKey ||
      !parsedOrderId ||
      !parsedAmount ||
      !courseId
    ) {
      setStatus('error');
      return;
    }
    if (hasCalledRef.current) return;
    hasCalledRef.current = true;
    setStatus('loading');

    try {
      const result = await confirmPayment({
        courseId,
        request: {
          paymentId: parsedPaymentId,
          paymentKey: parsedPaymentKey,
          orderId: parsedOrderId,
          amount: parsedAmount,
        },
      });
      if (!isMountedRef.current) return;
      setConfirmData(result);
      sendGTMEvent({
        event: 'purchase',
        revenue: result.amount,
        ...getAttributionParams(),
      });
      setStatus('success');
    } catch (error: unknown) {
      const errorInfo = analyzeError(error);
      if (!isMountedRef.current) return;
      if (errorInfo.errorCode === 'PAY202') {
        setStatus('already-confirmed');
      } else {
        setStatus('error');
      }
    }
  }, [
    isCourseLoading,
    isFreeCoupon,
    courseId,
    isParamValid,
    parsedPaymentId,
    parsedPaymentKey,
    parsedOrderId,
    parsedAmount,
    confirmPayment,
  ]);

  useEffect(() => {
    runConfirm().catch(() => {});
  }, [runConfirm]);

  const handleRetry = () => {
    hasCalledRef.current = false;
    runConfirm().catch(() => {});
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-500 animate-spin rounded-full border-4 border-background-brand-default border-t-transparent" />
      </div>
    );
  }

  if (status === 'already-confirmed') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-300">
        <p className="font-designer-20b text-gray-800">
          이미 완료된 결제입니다.
        </p>
        <Button
          type="button"
          color="primary"
          size="large"
          onClick={() => router.push(`/class/${slug}/home`)}
          className="h-auto px-400 py-200 font-designer-16b"
        >
          학습 홈으로 이동
        </Button>
      </div>
    );
  }

  if (status === 'error' || !confirmData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-300">
        <p className="font-designer-20b text-gray-800">
          결제 확인에 실패했습니다.
        </p>
        <p className="px-400 text-center font-designer-14r text-gray-500">
          결제가 정상 처리되었더라도 확인 과정에서 일시적 오류가 발생할 수
          있어요.
          <br />
          다시 시도하면 안전하게 확인합니다. (중복 청구되지 않아요)
        </p>
        <div className="flex items-center gap-200">
          <Button
            type="button"
            color="primary"
            size="large"
            onClick={handleRetry}
            className="h-auto px-400 py-200 font-designer-16b"
          >
            다시 시도
          </Button>
          <Button
            type="button"
            color="outlined"
            size="large"
            onClick={() => router.push(`/class/${slug}/home`)}
            className="h-auto border-gray-300 px-400 py-200 font-designer-16b text-gray-800"
          >
            학습 홈으로 이동
          </Button>
        </div>
      </div>
    );
  }

  if (confirmData.status === 'WAITING_FOR_DEPOSIT') {
    return (
      <CoursePaymentPending
        virtualAccount={{
          accountNumber: confirmData.virtualAccountNumber ?? '',
          dueDate: confirmData.virtualAccountDueDate ?? '',
          holderName: confirmData.virtualAccountHolderName ?? '',
          amount: confirmData.amount,
        }}
        onCancel={handleCancel}
        isCanceling={isCanceling}
      />
    );
  }

  return <CoursePaymentSuccess paymentConfirm={confirmData} slug={slug} />;
}

export default function VibeIntroPaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="size-500 animate-spin rounded-full border-4 border-background-brand-default border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
