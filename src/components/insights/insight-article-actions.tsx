'use client';

import { sendGTMEvent } from '@next/third-parties/google';
import { Sparkles, ThumbsUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { recordInsightView } from '@/api/endpoints/insights/insight-worldmap-api';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import ToggleButton from '@/components/common/ui/toggle/button';
import { triggerReadCelebration } from '@/components/insights/article-celebration';
import SaveResourceButton from '@/components/saved-resource/save-resource-button';
import {
  useInsightHelpfulMutation,
  useInsightMapQuery,
  useInsightProgressMutation,
} from '@/hooks/queries/insights/use-insight-worldmap-query';
import { useToastStore } from '@/stores/use-toast-store';
import type {
  InsightMap,
  InsightMapArticle,
  InsightNodeState,
} from '@/types/insight-worldmap';
import { SAVED_RESOURCE_TYPE } from '@/types/saved-resource';

interface CompletionFallback {
  islandId: number;
  islandName?: string;
  islandSlug: string;
}

interface PublicSocialProofSnapshot {
  documentId: string;
  explorerCount: number;
  helpfulCount: number;
  viewCount: number;
}

export const resolvePublicSocialProofSnapshot = ({
  article,
  documentId,
  previous,
}: {
  article?: InsightMapArticle;
  documentId: string;
  previous?: PublicSocialProofSnapshot;
}): PublicSocialProofSnapshot | undefined => {
  if (article?.documentId === documentId) {
    return {
      documentId,
      explorerCount: article.socialProof.explorerCount,
      helpfulCount: article.socialProof.helpfulCount,
      viewCount: article.socialProof.viewCount,
    };
  }

  return previous?.documentId === documentId ? previous : undefined;
};

export const resolvePersonalArticleInteraction = (
  article?: InsightMapArticle,
) =>
  article
    ? {
        helpfulByMe: article.socialProof.helpfulByMe,
        state: article.state,
      }
    : null;

export const resolveInsightCompletionVisibility = ({
  articleState,
  guestReachedCompletion,
  hasApprovedJourney,
  isMember,
  progressStatus,
}: {
  articleState?: InsightNodeState;
  guestReachedCompletion: boolean;
  hasApprovedJourney: boolean;
  isMember: boolean;
  progressStatus: 'idle' | 'pending' | 'error' | 'success';
}) => {
  if (hasApprovedJourney) return 'FULL_CROSS';

  if (!isMember) {
    return guestReachedCompletion ? 'LIGHT_CROSS' : 'PREVIEW';
  }

  return articleState === 'READ' || progressStatus === 'success'
    ? 'FULL_CROSS'
    : 'PREVIEW';
};

export const resolveInsightCompletionDescription = (
  visibility: 'LIGHT_CROSS' | 'FULL_CROSS',
) =>
  visibility === 'LIGHT_CROSS'
    ? '여기까지 다 읽으셨어요. 로그인하면 완독 기록이 남아요.'
    : '읽은 맥락을 이어가거나, 관련 화두를 다시 살펴볼 수 있어요.';

export const resolveInsightCompletionJourney = ({
  documentId,
  fallback,
  insightMap,
}: {
  documentId: string;
  fallback: CompletionFallback;
  insightMap?: InsightMap;
}) => {
  const island = insightMap?.islands.find((candidate) =>
    candidate.articles.some((article) => article.documentId === documentId),
  );
  const articleIndex =
    island?.articles.findIndex(
      (article) => article.documentId === documentId,
    ) ?? -1;
  const nextArticle =
    island && articleIndex >= 0 ? island.articles[articleIndex + 1] : undefined;
  const islandSlug = island?.slug ?? fallback.islandSlug;

  return {
    islandName: island?.name ?? fallback.islandName ?? '이 개척지',
    koanHref: `/insights/koans?category=${encodeURIComponent(islandSlug)}`,
    nextArticle: nextArticle
      ? {
          href: `/insights/${nextArticle.slug}`,
          title: nextArticle.title,
        }
      : null,
    room: island?.bridgeRoomId
      ? {
          href: `/community/rooms/${island.bridgeRoomId}?from=${encodeURIComponent(islandSlug)}`,
          name: island.bridgeRoomName ?? `${island.name} 공부방`,
        }
      : null,
  };
};

export default function InsightArticleActions({
  articleSlug,
  documentId,
  fallback,
  memberId,
}: {
  articleSlug: string;
  documentId: string;
  fallback: CompletionFallback;
  memberId?: number;
}) {
  const map = useInsightMapQuery();
  const helpful = useInsightHelpfulMutation();
  const progress = useInsightProgressMutation();
  const recordProgress = progress.mutate;
  const showToast = useToastStore((state) => state.showToast);
  const [guestReachedCompletion, setGuestReachedCompletion] = useState(false);
  const [islandOpened, setIslandOpened] = useState(false);
  const completionRequested = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const article = useMemo(
    () =>
      map.data?.islands
        .flatMap((island) => island.articles)
        .find((item) => item.documentId === documentId),
    [documentId, map.data],
  );
  const publicSocialProofSnapshotRef =
    useRef<PublicSocialProofSnapshot>(undefined);
  const publicSocialProof = resolvePublicSocialProofSnapshot({
    article,
    documentId,
    previous: publicSocialProofSnapshotRef.current,
  });
  if (article) publicSocialProofSnapshotRef.current = publicSocialProof;
  const personalArticleInteraction = resolvePersonalArticleInteraction(article);
  const personalArticleState = personalArticleInteraction?.state;
  const journey = useMemo(
    () =>
      resolveInsightCompletionJourney({
        documentId,
        fallback,
        insightMap: map.data,
      }),
    [documentId, fallback, map.data],
  );
  const completionVisibility = resolveInsightCompletionVisibility({
    articleState: personalArticleState,
    guestReachedCompletion,
    hasApprovedJourney: Boolean(journey.nextArticle && journey.room),
    isMember: memberId !== undefined,
    progressStatus: progress.status,
  });
  const showGuestCompletionStatus =
    memberId === undefined && guestReachedCompletion;
  useEffect(() => {
    recordInsightView(documentId).catch(() => undefined);
  }, [documentId]);
  const toggleHelpful = () => {
    if (!memberId) {
      showToast('로그인하면 도움됨을 남길 수 있어요.', 'error');
      return;
    }
    if (!personalArticleInteraction) {
      showToast('읽기 상태를 다시 불러오고 있어요.', 'error');
      return;
    }
    const nextHelpful = !personalArticleInteraction.helpfulByMe;
    helpful.mutate(
      { documentId, helpful: nextHelpful },
      {
        onSuccess: () => {
          sendGTMEvent({
            event: 'helpful_click',
            article_slug: articleSlug,
            action: nextHelpful ? 'add' : 'remove',
          });
        },
        onError: () => showToast('도움됨을 반영하지 못했어요.', 'error'),
      },
    );
  };
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (
      !sentinel ||
      (memberId && (!personalArticleState || personalArticleState === 'READ'))
    )
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        if (!memberId) {
          setGuestReachedCompletion(true);
          // 회장 지시(2026-09-17): 다 내렸을 때 컨페티. 비로그인도 여기까지
          // 왔다는 건 본문 끝 sentinel 에 닿았다는 뜻이라 똑같이 축하한다.
          triggerReadCelebration(documentId);
          observer.disconnect();
          return;
        }

        if (completionRequested.current) return;
        completionRequested.current = true;
        recordProgress(documentId, {
          onSuccess: (result) => {
            setIslandOpened(result.island.conqueredNow);
            showToast(
              result.island.conqueredNow
                ? '이 땅의 물길을 모두 열었어요.'
                : '여기까지 읽은 기록을 남겼어요.',
              'success',
            );
            // 완독 토스트는 위에서 이미 낸다 — 컨페티만 세션당 1회 더한다
            // (기존 markInsightRead/recordProgress 완료 지점과 합침,
            // 회장 지시 2026-09-17 ask 2).
            triggerReadCelebration(documentId);
          },
          onError: () => {
            completionRequested.current = false;
            showToast('완독 기록을 남기지 못했어요.', 'error');
          },
        });
      },
      { threshold: 0.7 },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [personalArticleState, documentId, memberId, recordProgress, showToast]);
  return (
    <section
      ref={sentinelRef}
      data-testid="insight-completion-sentinel"
      className="mt-500 rounded-250 border border-border-subtle bg-background-alternative p-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-150">
        <div>
          <h2 className="font-designer-15b text-text-strong">이 편의 기록</h2>
          <p className="font-designer-12r text-text-subtle mt-50 inline-flex flex-wrap items-center gap-125">
            <span className="inline-flex items-center gap-25">
              <Users className="size-150" aria-hidden />
              지나간 사람 {publicSocialProof?.explorerCount ?? 0}
            </span>
            <span>조회 {publicSocialProof?.viewCount ?? 0}</span>
            <span>도움됨 {publicSocialProof?.helpfulCount ?? 0}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-75">
          <SaveResourceButton
            resourceKey={documentId}
            resourceType={SAVED_RESOURCE_TYPE.INSIGHT_ARTICLE}
            showLabel={true}
          />
          <ToggleButton
            pressed={personalArticleInteraction?.helpfulByMe ?? false}
            disabled={
              helpful.isPending ||
              (memberId !== undefined && !personalArticleInteraction)
            }
            onPressedChange={toggleHelpful}
            size="sm"
            variant="round"
            className={cn(
              'font-designer-12b inline-flex items-center gap-50 rounded-200 border px-125 py-75',
              personalArticleInteraction?.helpfulByMe
                ? 'data-[state=on]:border-border-brand data-[state=on]:bg-background-accent-rose-subtle data-[state=on]:text-text-brand'
                : 'data-[state=off]:border-border-subtle data-[state=off]:bg-background-default data-[state=off]:text-text-subtle',
            )}
          >
            <ThumbsUp className="size-150" aria-hidden />
            도움됐어요
          </ToggleButton>
        </div>
      </div>
      {!memberId && (
        <div className="mt-150 rounded-150 border border-border-subtle bg-background-default p-150">
          <p className="font-designer-13b text-text-strong">
            첫 편은 여기까지 전부 열려 있습니다.
          </p>
          <p className="font-designer-12r mt-50 text-text-subtle">
            로그인하면 하루 다섯 물길과 읽은 자리를 이어서 기록해요.
          </p>
          <Button
            asChild
            color="primary"
            size="large"
            className="mt-175 min-h-600 w-full"
          >
            <Link href="/login">3초 로그인 →</Link>
          </Button>
        </div>
      )}
      {islandOpened && (
        <output className="bg-fill-warning-subtle-default text-text-warning mt-150 flex items-center gap-100 rounded-200 p-150">
          <Sparkles className="size-200" aria-hidden />
          <div>
            <p className="font-designer-14b">이 땅의 물길을 모두 열었어요</p>
            <p className="font-designer-12r mt-25">
              바다에서 이 땅이 더 가까이 보입니다.
            </p>
          </div>
        </output>
      )}
      {completionVisibility === 'PREVIEW' ? (
        <p
          className="font-designer-13m mt-250 border-t border-border-subtle pt-250 text-text-subtle"
          data-testid="insight-completion-preview"
        >
          끝까지 읽으면 다음 글과 관련 화두로 이어갈 수 있어요.
        </p>
      ) : (
        <div
          className={cn(
            'mt-250 border-t border-border-subtle pt-250',
            completionVisibility === 'FULL_CROSS' &&
              'rounded-200 border-0 bg-fill-neutral-strong-default p-200 text-text-inverse',
          )}
          data-testid={
            completionVisibility === 'LIGHT_CROSS'
              ? 'insight-completion-light-cross'
              : 'insight-completion-journey'
          }
        >
          <h2
            className={cn(
              'font-designer-18b',
              completionVisibility === 'FULL_CROSS'
                ? 'text-text-inverse'
                : 'text-text-strong',
            )}
          >
            이어서 어디로 갈까요
          </h2>
          <p
            role={showGuestCompletionStatus ? 'status' : undefined}
            className={cn(
              'font-designer-13r mt-50',
              completionVisibility === 'FULL_CROSS'
                ? 'text-text-inverse opacity-70'
                : 'text-text-subtle',
            )}
          >
            {resolveInsightCompletionDescription(
              showGuestCompletionStatus ? 'LIGHT_CROSS' : completionVisibility,
            )}
          </p>
          <div className="mt-175 grid gap-100 sm:grid-cols-2">
            {journey.nextArticle ? (
              <Button
                asChild
                color="outlined"
                size="large"
                className={cn(
                  'h-auto min-h-700 justify-start gap-75 py-125 text-left',
                  completionVisibility === 'FULL_CROSS' &&
                    'border-border-inverse text-text-inverse hover:bg-background-dimmer hover:text-text-inverse',
                )}
              >
                <Link
                  data-testid="insight-completion-next"
                  href={journey.nextArticle.href}
                >
                  다음 글: {journey.nextArticle.title}
                </Link>
              </Button>
            ) : (
              <output
                data-testid="insight-completion-next-fallback"
                className="font-designer-14m flex min-h-700 items-center rounded-100 border border-border-subtle bg-background-disabled px-200 py-125 text-text-disabled-strong"
              >
                이 개척지의 다음 글은 아직 열리지 않았어요.
              </output>
            )}
            <Button
              asChild
              color="outlined"
              size="large"
              className={cn(
                'h-auto min-h-700 justify-start gap-75 py-125 text-left',
                completionVisibility === 'FULL_CROSS' &&
                  'border-border-inverse text-text-inverse hover:bg-background-dimmer hover:text-text-inverse',
              )}
            >
              <Link
                data-testid="insight-completion-koan"
                href={journey.koanHref}
              >
                관련 화두 다시 생각하기
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
