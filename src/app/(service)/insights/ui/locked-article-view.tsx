'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LockKeyhole, Waves } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { axiosInstance } from '@/api/client/axios';
import type { ArticleTeaser } from '@/types/insights/article';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { buildLoginPathForInsightCallback } from '@/features/auth/model/oauth-callback';

interface LockedArticleViewProps {
  authDegraded: boolean;
  memberId?: number;
  teaser: ArticleTeaser;
}

export default function LockedArticleView({
  authDegraded,
  memberId,
  teaser,
}: LockedArticleViewProps) {
  const router = useRouter();
  const { memberId: hydratedMemberId } = useAuthReady();
  const effectiveMemberId = hydratedMemberId ?? memberId;
  const [pending, setPending] = useState(false);
  const [budgetEmpty, setBudgetEmpty] = useState(false);

  const unlock = async () => {
    if (!effectiveMemberId) {
      const callbackPath = `/insights/${encodeURIComponent(teaser.slug)}`;
      router.push(
        buildLoginPathForInsightCallback(
          callbackPath,
          `/insights/land/${encodeURIComponent(teaser.islandSlug)}`,
        ),
      );
      return;
    }

    setPending(true);
    try {
      const response = await axiosInstance.post<{
        content?: { unlocked?: boolean };
        data?: { unlocked?: boolean };
      }>(`insight/articles/${encodeURIComponent(teaser.documentId)}/unlock`);
      const unlocked =
        response.data.data?.unlocked ?? response.data.content?.unlocked;

      if (unlocked === false) {
        setBudgetEmpty(true);
        return;
      }

      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background-alternative pb-1000">
      <div className="mx-auto max-w-3xl px-250 pt-400 sm:px-400 sm:pt-600">
        <Link
          href={`/insights/land/${teaser.islandSlug}`}
          className="font-designer-13b inline-flex min-h-550 items-center text-text-subtle"
        >
          ← {teaser.islandName ?? '개척지'}
        </Link>

        {authDegraded && (
          <div
            className="font-designer-13m mt-150 rounded-150 border border-border-warning bg-background-accent-yellow-subtle p-175 text-text-warning"
            role="status"
          >
            세션이 만료됐어요. 다시 로그인하면 이어서 읽을 수 있어요.
          </div>
        )}

        <article className="mt-200 overflow-hidden rounded-250 border border-border-subtle bg-background-default shadow-2">
          {teaser.coverUrl && (
            <div className="relative h-2400 w-full sm:h-3200">
              <Image
                unoptimized
                src={teaser.coverUrl}
                alt=""
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
          <div className="p-250 sm:p-400">
            <div className="font-designer-12b flex items-center gap-75 text-text-brand">
              <LockKeyhole className="size-175" aria-hidden />
              {teaser.ordinal}번째 물길
            </div>
            <h1 className="font-designer-28b mt-125 text-text-strong sm:font-designer-36b">
              {teaser.title}
            </h1>
            <p className="font-designer-15r mt-175 leading-relaxed text-text-subtle">
              {teaser.teaser}
            </p>

            <div className="mt-300 rounded-175 bg-background-alternative p-200">
              <div className="flex items-center gap-100">
                <Waves className="size-225 text-text-warning" aria-hidden />
                <div>
                  <p className="font-designer-14b text-text-strong">
                    {effectiveMemberId
                      ? `물길 ${teaser.unlockCost}개로 이 편을 엽니다`
                      : '로그인하면 하루 다섯 물길이 생깁니다'}
                  </p>
                  <p className="font-designer-12r mt-25 text-text-subtle">
                    화두는 물길 없이 언제든 읽을 수 있어요.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                color={budgetEmpty ? 'secondary' : 'primary'}
                size="large"
                onClick={unlock}
                disabled={pending || budgetEmpty}
                className={cn(
                  'font-designer-14b mt-175 min-h-600 w-full rounded-150',
                  budgetEmpty
                    ? 'bg-fill-neutral-default-default text-text-subtle disabled:bg-fill-neutral-default-default disabled:text-text-subtle'
                    : 'bg-fill-brand-default text-text-inverse hover:bg-fill-brand-default-hover active:bg-fill-brand-default-hover disabled:bg-fill-brand-default disabled:text-text-inverse',
                )}
                data-testid="unlock-article"
              >
                {pending
                  ? '물길을 여는 중이에요'
                  : budgetEmpty
                    ? '내일 아침 물이 차면 열립니다'
                    : effectiveMemberId
                      ? '이 편 열기'
                      : '3초 로그인'}
              </Button>
            </div>

            {teaser.freeAlternative && (
              <Link
                href={`/insights/koans/${teaser.freeAlternative.koanId}`}
                className="font-designer-13b mt-175 flex min-h-550 items-center justify-between rounded-150 border border-border-subtle px-175 text-text-default"
              >
                물길 없이 읽는 화두 보기 <span aria-hidden>→</span>
              </Link>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
