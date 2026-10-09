'use client';

import { ClipboardCopy } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '@/components/common/ui/button';
import { BaseInput } from '@/components/common/ui/input';
import TextActionButton from '@/components/common/ui/text-action-button';
import {
  useGetMyCoupons,
  useRegisterCoupon,
} from '@/hooks/queries/coupon/coupon-queries';
import { useToastStore } from '@/stores/use-toast-store';
import type { MyCouponResponse } from '@/types/api/coupon.types';
import { analyzeError } from '@/utils/error-handler';
import { trackShare } from '@/utils/share-tracking';

export default function BuilderTicketPageClient() {
  const showToast = useToastStore((state) => state.showToast);
  const { data: coupons = [], isLoading } = useGetMyCoupons();
  const registerCoupon = useRegisterCoupon();
  const [code, setCode] = useState('');

  const registeredCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.status === 'REGISTERED'),
    [coupons],
  );

  const handleRegister = async () => {
    try {
      await registerCoupon.mutateAsync({ code });
      setCode('');
    } catch (error) {
      showToast(analyzeError(error).userMessage, 'error');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-9175 flex-col gap-300 px-400 py-500">
      <section className="rounded-100 border border-border-subtle bg-background-default p-300">
        <h1 className="font-designer-24b text-text-default">쿠폰/혜택</h1>
        <div className="mt-300 flex flex-col gap-150 lg:flex-row">
          <BaseInput
            value={code}
            onValueChange={setCode}
            placeholder="받은 쿠폰 코드를 입력하세요"
            className="uppercase"
          />
          <Button
            type="button"
            className="h-600 lg:w-1800"
            onClick={handleRegister}
            disabled={!code.trim()}
            loading={registerCoupon.isPending}
            loadingText="등록 중..."
          >
            등록
          </Button>
        </div>
      </section>

      <section className="rounded-100 border border-border-subtle bg-background-default p-300">
        <div className="mb-250 flex items-center justify-between">
          <h2 className="font-designer-18b text-text-default">내 쿠폰</h2>
          <span className="font-designer-13r text-text-subtle">
            사용 가능 {registeredCoupons.length}장
          </span>
        </div>
        {isLoading ? (
          <p className="font-designer-14r text-text-subtle">불러오는 중...</p>
        ) : coupons.length === 0 ? (
          <p className="font-designer-14r text-text-subtle">
            등록된 쿠폰이 없습니다.
          </p>
        ) : (
          <div className="grid gap-200 lg:grid-cols-2">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.memberCouponId} coupon={coupon} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CouponCard({ coupon }: { coupon: MyCouponResponse }) {
  const showToast = useToastStore((state) => state.showToast);
  const isUsed = coupon.status === 'USED';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coupon.code);
    showToast('쿠폰 코드를 복사했습니다.', 'success');
    trackShare('builder_ticket', 'clipboard');
  };

  return (
    <article className="rounded-100 border border-border-subtle bg-background-subtle p-250">
      <div className="flex items-start justify-between gap-200">
        <div>
          <p className="font-designer-13b text-text-subtle">
            {formatDiscount(coupon)}
          </p>
          <p className="mt-75 font-designer-20b text-text-default">
            {coupon.code}
          </p>
        </div>
        <span className="rounded-75 bg-background-default px-150 py-75 font-designer-12b text-text-subtle">
          {isUsed ? '사용됨' : '등록됨'}
        </span>
      </div>
      <div className="mt-250 flex items-center justify-between gap-200">
        <p className="font-designer-13r text-text-subtle">
          {coupon.validUntil
            ? `${new Date(coupon.validUntil).toLocaleDateString('ko-KR')}까지`
            : '유효기간 제한 없음'}
        </p>
        <TextActionButton
          type="button"
          onClick={handleCopy}
          icon={<ClipboardCopy className="size-200" />}
          weight="bold"
          className="gap-75 border-0 p-0 text-text-brand disabled:text-text-disabled"
          disabled={isUsed}
          title="쿠폰 코드 복사"
        >
          복사
        </TextActionButton>
      </div>
    </article>
  );
}

function formatDiscount(coupon: MyCouponResponse) {
  if (coupon.discountType === 'FREE') return '전액 무료 쿠폰';
  if (coupon.discountType === 'PERCENT') {
    return `${coupon.discountValue ?? 0}% 할인 쿠폰`;
  }
  return `${(coupon.discountValue ?? 0).toLocaleString()}원 할인 쿠폰`;
}
