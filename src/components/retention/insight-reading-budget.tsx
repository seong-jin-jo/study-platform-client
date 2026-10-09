'use client';

import { LockKeyhole, RefreshCw } from 'lucide-react';
import Button from '@/components/common/ui/button';
import TextActionButton from '@/components/common/ui/text-action-button';
import {
  RetentionPage,
  SectionTitle,
} from '@/components/retention/retention-shell';
import {
  useInsightReadingBudgetQuery,
  useUnlockInsightArticleMutation,
} from '@/hooks/queries/retention/use-retention-queries';
import { useToastStore } from '@/stores/use-toast-store';

export default function InsightReadingBudget({
  articleId,
}: {
  articleId: string;
}) {
  const showToast = useToastStore((state) => state.showToast);
  const budgetQuery = useInsightReadingBudgetQuery();
  const unlockMutation = useUnlockInsightArticleMutation();

  const unlockArticle = () => {
    unlockMutation.mutate(articleId, {
      onSuccess: (result) => {
        showToast(
          result.cost === 0
            ? '이미 열어둔 글이에요.'
            : `글을 열었어요. 남은 포인트는 ${result.balanceAfter}개예요.`,
          'success',
        );
      },
      onError: () => {
        showToast('글을 열지 못했어요. 포인트 잔액을 확인해주세요.', 'error');
      },
    });
  };

  return (
    <RetentionPage>
      <section className="mx-auto max-w-3000 rounded-250 border border-gray-200 bg-white p-250">
        <SectionTitle>읽기 포인트</SectionTitle>
        {budgetQuery.isLoading && (
          <p className="mt-150 text-[14px] text-gray-600">
            잔액을 불러오는 중이에요.
          </p>
        )}
        {budgetQuery.isError && (
          <div className="mt-150 rounded-150 bg-gray-50 p-200 text-center">
            <p className="text-[14px] text-gray-600">
              지금은 읽기 포인트를 사용할 수 없어요.
            </p>
            <TextActionButton
              type="button"
              onClick={() => budgetQuery.refetch()}
              className="mt-125 rounded-none border-0 p-0 font-designer-13b font-bold text-rose-600 hover:text-rose-600"
            >
              <RefreshCw className="size-150" aria-hidden /> 다시 시도
            </TextActionButton>
          </div>
        )}
        {budgetQuery.data && (
          <>
            <p className="mt-150 text-[28px] font-bold tabular-nums text-gray-900">
              {budgetQuery.data.balance}
              <span className="ml-50 text-[14px] font-semibold text-gray-500">
                / {budgetQuery.data.dailyCap} 포인트
              </span>
            </p>
            <p className="mt-75 font-designer-13r leading-[1.6] text-gray-600">
              포인트는 본인에게만 보이며, 다음 충전 시각은{' '}
              {new Date(budgetQuery.data.nextRechargeAt).toLocaleString(
                'ko-KR',
              )}
              이에요.
            </p>
            <div className="mt-250 rounded-150 bg-gray-50 p-200">
              <div className="flex items-start gap-100">
                <LockKeyhole
                  className="mt-25 size-200 flex-none text-rose-500"
                  aria-hidden
                />
                <div>
                  <h1 className="text-[16px] font-bold">이 글 열기</h1>
                  <p className="mt-50 font-designer-13r leading-[1.6] text-gray-600">
                    이 인사이트를 읽기 포인트로 열 수 있어요. 이미 연 글은 다시
                    차감하지 않아요.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                color="primary"
                size="large"
                aria-busy={unlockMutation.isPending}
                onClick={unlockArticle}
                disabled={unlockMutation.isPending}
                className="mt-175 rounded-125 font-designer-14b disabled:bg-gray-300"
              >
                {unlockMutation.isPending ? '여는 중…' : '포인트로 글 열기'}
              </Button>
            </div>
          </>
        )}
      </section>
    </RetentionPage>
  );
}
