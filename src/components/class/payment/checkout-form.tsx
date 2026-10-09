'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { TossPaymentsPayment } from '@tosspayments/tosspayments-sdk';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '@/components/common/ui/button';
import { NativeSelect } from '@/components/common/ui/input';
import { useGetMyCoupons } from '@/hooks/queries/coupon/coupon-queries';
import {
  useCompleteFreeCouponCoursePayment,
  usePrepareCoursePayment,
} from '@/hooks/queries/course/course-queries';
import { useToastStore } from '@/stores/use-toast-store';
import { useUserStore } from '@/stores/use-user-store';
import type { MyCouponResponse } from '@/types/api/coupon.types';
import type {
  CoursePlanCode,
  CoursePlanResponse,
} from '@/types/api/course.types';
import { AmountSection } from './amount-section';
import { BuyerInfoSection } from './buyer-info-section';
import { CourseSummarySection } from './course-summary-section';
import { PaymentExitConfirmModal } from './payment-exit-confirm-modal';
import { TosSection } from './tos-section';

const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';
const CUSTOMER_KEY_SANITIZE_RE = /[^a-zA-Z0-9\-_=.@]/g;

const checkoutFormSchema = z.object({
  buyerName: z.string().min(1, '이름을 입력해주세요.'),
  buyerEmail: z.email('올바른 이메일 주소를 입력해주세요.'),
  buyerPhone: z.string().min(10, '올바른 휴대폰 번호를 입력해주세요.'),
  tosAgreed: z.literal(true, { message: '이용약관에 동의해주세요.' }),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

type PaymentMethod = 'CARD' | 'VIRTUAL_ACCOUNT';

interface NavigationGuardHandlers {
  popState: () => void;
  beforeUnload: (_e: BeforeUnloadEvent) => void;
}

interface CheckoutState {
  paymentMethod: PaymentMethod;
  isPhoneVerified: boolean;
  isLoading: boolean;
  paymentFailed: boolean;
  paymentErrorMsg: string | null;
  showExitModal: boolean;
}

type CheckoutAction =
  | { type: 'setPaymentMethod'; method: PaymentMethod }
  | { type: 'setPhoneVerified'; verified: boolean }
  | { type: 'startPayment' }
  | { type: 'stopLoading' }
  | { type: 'failPayment'; message: string }
  | { type: 'setExitModal'; open: boolean };

const INITIAL_CHECKOUT: CheckoutState = {
  paymentMethod: 'CARD',
  isPhoneVerified: false,
  isLoading: false,
  paymentFailed: false,
  paymentErrorMsg: null,
  showExitModal: false,
};

function checkoutReducer(
  state: CheckoutState,
  action: CheckoutAction,
): CheckoutState {
  switch (action.type) {
    case 'setPaymentMethod':
      return { ...state, paymentMethod: action.method };
    case 'setPhoneVerified':
      return { ...state, isPhoneVerified: action.verified };
    case 'startPayment':
      return {
        ...state,
        isLoading: true,
        paymentFailed: false,
        paymentErrorMsg: null,
      };
    case 'stopLoading':
      return { ...state, isLoading: false };
    case 'failPayment':
      return { ...state, paymentFailed: true, paymentErrorMsg: action.message };
    case 'setExitModal':
      return { ...state, showExitModal: action.open };
    default:
      return state;
  }
}

interface CourseCheckoutFormProps {
  slug: string;
  plan: CoursePlanResponse;
  courseId: number;
  planCode: CoursePlanCode;
  onChangePlan: () => void;
  thumbnailUrl: string | null;
}

export function CourseCheckoutForm({
  slug,
  plan,
  courseId,
  planCode,
  onChangePlan,
  thumbnailUrl,
}: CourseCheckoutFormProps) {
  const { memberId, memberName, tel } = useUserStore();
  const showToast = useToastStore((s) => s.showToast);
  const prepareCoursePayment = usePrepareCoursePayment();
  const completeFreeCoursePayment = useCompleteFreeCouponCoursePayment();
  const { data: myCoupons = [] } = useGetMyCoupons();
  const [couponCode, setCouponCode] = useState('');

  const [state, dispatch] = useReducer(checkoutReducer, INITIAL_CHECKOUT);
  const {
    paymentMethod,
    isPhoneVerified,
    isLoading,
    paymentFailed,
    paymentErrorMsg,
    showExitModal,
  } = state;
  const paymentRef = useRef(null as TossPaymentsPayment | null);
  const navigationGuardRef = useRef(null as NavigationGuardHandlers | null);

  const usableCoupons = useMemo(
    () => myCoupons.filter((coupon) => coupon.status === 'REGISTERED'),
    [myCoupons],
  );
  const selectedCoupon = useMemo(
    () => usableCoupons.find((coupon) => coupon.code === couponCode) ?? null,
    [couponCode, usableCoupons],
  );
  const estimatedCouponDiscount = selectedCoupon
    ? calculateCouponDiscount(selectedCoupon, plan.discountPrice)
    : 0;
  const estimatedFinalAmount = Math.max(
    0,
    plan.discountPrice - estimatedCouponDiscount,
  );

  const methods: UseFormReturn<CheckoutFormValues> = useForm({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      buyerName: memberName ?? '',
      buyerEmail: '',
      buyerPhone: tel ?? '',
    },
  });

  useEffect(() => {
    if (!clientKey || !memberId) return;

    const customerKey = `member-${memberId}`.replace(
      CUSTOMER_KEY_SANITIZE_RE,
      '',
    );
    if (customerKey.length < 2 || customerKey.length > 50) return;

    loadTossPayments(clientKey)
      .then((toss) => {
        paymentRef.current = toss.payment({ customerKey });
      })
      .catch(() => {
        showToast('결제 모듈 초기화에 실패했습니다.', 'error');
      });
  }, [memberId, showToast]);

  // Navigation guard — intercepts browser back button
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      dispatch({ type: 'setExitModal', open: true });
      window.history.pushState(null, '', window.location.href);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    navigationGuardRef.current = {
      popState: handlePopState,
      beforeUnload: handleBeforeUnload,
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handlePay = methods.handleSubmit(
    async (values) => {
      if (!paymentMethod) {
        showToast('결제 수단을 선택해주세요.', 'error');
        return;
      }
      if (!isPhoneVerified) {
        showToast('휴대폰 인증을 완료해주세요.', 'error');
        return;
      }
      dispatch({ type: 'startPayment' });

      let prepareData;
      try {
        prepareData = await prepareCoursePayment.mutateAsync({
          courseId,
          request: {
            planCode,
            buyerName: values.buyerName,
            buyerEmail: values.buyerEmail,
            buyerPhoneCountryCode: '+82',
            buyerPhoneNumber: values.buyerPhone,
            agreedToTerms: true,
            couponCode: couponCode || null,
            paymentMethod,
          },
        });
      } catch {
        showToast(
          '결제 준비 중 오류가 발생했습니다. 다시 시도해주세요.',
          'error',
        );
        dispatch({ type: 'stopLoading' });
        return;
      }

      try {
        if (prepareData.freeCheckout) {
          const confirmData = await completeFreeCoursePayment.mutateAsync({
            courseId,
            paymentId: prepareData.paymentId,
          });
          sessionStorage.setItem(
            `course-free-payment:${prepareData.paymentId}`,
            JSON.stringify(confirmData),
          );
          window.location.assign(
            `${window.location.origin}/class/${slug}/payment/success` +
              `?paymentId=${prepareData.paymentId}&method=FREE_COUPON`,
          );
          return;
        }

        if (!paymentRef.current) {
          showToast(
            '결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.',
            'error',
          );
          return;
        }

        const baseParams = {
          amount: { currency: 'KRW' as const, value: prepareData.amount },
          orderId: prepareData.tossOrderId,
          orderName: prepareData.orderName,
          successUrl:
            `${window.location.origin}/class/${slug}/payment/success` +
            `?paymentId=${prepareData.paymentId}&method=${paymentMethod}`,
          failUrl: `${window.location.origin}/class/${slug}/payment?planCode=${planCode}`,
          customerName: values.buyerName,
          customerMobilePhone: values.buyerPhone,
        };

        if (paymentMethod === 'CARD') {
          await paymentRef.current.requestPayment({
            method: 'CARD',
            ...baseParams,
            card: {
              useEscrow: false,
              flowMode: 'DEFAULT',
              useCardPoint: false,
              useAppCardOnly: false,
            },
          });
        } else {
          await paymentRef.current.requestPayment({
            method: 'VIRTUAL_ACCOUNT',
            ...baseParams,
            virtualAccount: {
              cashReceipt: { type: '소득공제' },
              useEscrow: false,
            },
          });
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '';

        if (
          msg.includes('USER_CANCEL') ||
          msg.includes('PAY_PROCESS_CANCELED')
        ) {
          showToast('결제가 취소되었습니다.', 'error');
          return;
        }

        if (
          error instanceof TypeError ||
          msg.toLowerCase().includes('network')
        ) {
          showToast('네트워크가 불안정해요. 다시 시도해주세요.', 'error');
        } else {
          dispatch({
            type: 'failPayment',
            message:
              '카드에서 결제를 거절했어요. 다른 카드로 시도하시거나 카드사에 문의해주세요.',
          });
          showToast('결제에 실패했어요. 다시 시도해주세요.', 'error');
        }
      } finally {
        dispatch({ type: 'stopLoading' });
      }
    },
    (errors) => {
      if (errors.tosAgreed) {
        showToast('이용약관에 동의해주세요.', 'error');
      }
    },
  );

  const handleContinuePayment = () =>
    dispatch({ type: 'setExitModal', open: false });

  const handleExitPayment = () => {
    if (navigationGuardRef.current) {
      window.removeEventListener(
        'popstate',
        navigationGuardRef.current.popState,
      );
      window.removeEventListener(
        'beforeunload',
        navigationGuardRef.current.beforeUnload,
      );
    }
    window.location.href = `/class/${slug}/home`;
  };

  const canPay = !isLoading;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handlePay}
        className="mx-auto flex w-full max-w-9175 flex-col gap-300 px-600 pb-1000 pt-500"
      >
        <CourseSummarySection
          plan={plan}
          onChangePlan={onChangePlan}
          thumbnailUrl={thumbnailUrl}
        />

        <BuyerInfoSection
          onVerified={(verified) =>
            dispatch({ type: 'setPhoneVerified', verified })
          }
        />

        <div className="rounded-200 border border-gray-300 bg-background-default px-500 py-400">
          <h2 className="mb-300 font-designer-18b text-gray-800">쿠폰</h2>
          <NativeSelect
            className="h-600 w-full px-150 font-designer-16m"
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
          >
            <option value="">쿠폰 선택 안 함</option>
            {usableCoupons.map((coupon) => (
              <option key={coupon.memberCouponId} value={coupon.code}>
                {coupon.code} · {formatCouponLabel(coupon)}
              </option>
            ))}
          </NativeSelect>
          {selectedCoupon && (
            <p className="mt-150 font-designer-13r text-text-subtle">
              예상 할인 {estimatedCouponDiscount.toLocaleString()}원
            </p>
          )}
        </div>

        {/* 결제 수단 */}
        <div className="rounded-200 border border-gray-300 bg-background-default px-500 py-400">
          <h2 className="mb-300 font-designer-18b text-gray-800">결제 수단</h2>
          <div className="flex flex-col gap-150">
            {/* CARD — enabled */}
            <label className="flex cursor-pointer items-center gap-200">
              <input
                type="radio"
                name="paymentMethod"
                value="CARD"
                checked={paymentMethod === 'CARD'}
                onChange={() =>
                  dispatch({ type: 'setPaymentMethod', method: 'CARD' })
                }
                className="accent-background-brand-default"
              />
              <span className="font-designer-16m text-gray-800">
                신용카드 결제
              </span>
            </label>

            {paymentFailed && paymentErrorMsg && paymentMethod === 'CARD' && (
              <p className="font-designer-12r text-text-error">
                {paymentErrorMsg}
              </p>
            )}

            <label className="flex cursor-pointer items-center gap-200">
              <input
                type="radio"
                name="paymentMethod"
                value="VIRTUAL_ACCOUNT"
                checked={paymentMethod === 'VIRTUAL_ACCOUNT'}
                onChange={() =>
                  dispatch({
                    type: 'setPaymentMethod',
                    method: 'VIRTUAL_ACCOUNT',
                  })
                }
                className="accent-background-brand-default"
              />
              <span className="font-designer-16m text-gray-800">
                무통장 입금 (가상계좌)
              </span>
            </label>
          </div>
        </div>

        <AmountSection
          plan={plan}
          couponDiscountAmount={estimatedCouponDiscount}
          finalAmount={estimatedFinalAmount}
        />

        <TosSection />

        <Button
          type="submit"
          disabled={!canPay}
          color="primary"
          size="large"
          className="h-700 w-full font-designer-18b disabled:opacity-40"
        >
          {isLoading
            ? '결제 처리 중...'
            : paymentFailed
              ? '다시 결제하기'
              : estimatedFinalAmount === 0
                ? '무료 등록하기'
                : `${estimatedFinalAmount.toLocaleString()}원 결제하기`}
        </Button>
      </form>

      <PaymentExitConfirmModal
        open={showExitModal}
        onContinue={handleContinuePayment}
        onExit={handleExitPayment}
      />
    </FormProvider>
  );
}

function calculateCouponDiscount(coupon: MyCouponResponse, amount: number) {
  if (coupon.discountType === 'FREE') return amount;
  if (coupon.discountType === 'PERCENT') {
    return Math.min(
      amount,
      Math.floor((amount * (coupon.discountValue ?? 0)) / 100),
    );
  }
  return Math.min(amount, coupon.discountValue ?? 0);
}

function formatCouponLabel(coupon: MyCouponResponse) {
  if (coupon.discountType === 'FREE') return '전액 무료';
  if (coupon.discountType === 'PERCENT') return `${coupon.discountValue ?? 0}%`;
  return `${(coupon.discountValue ?? 0).toLocaleString()}원`;
}
