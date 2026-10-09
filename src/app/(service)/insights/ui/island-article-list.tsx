'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { Skeleton } from '@/components/common/ui/loading-skeleton';
import { IslandEnterTracker } from '@/components/insights/insight-core-event-trackers';
import { getIslandArt } from '@/components/insights/insight-learning-map';
import { useAuth } from '@/features/auth/model/use-auth';
import { buildLoginPathForInsightCallback } from '@/features/auth/model/oauth-callback';
import { useCommunityRoomDetailQuery } from '@/hooks/queries/community/use-community-room-hub-query';
import {
  useInsightIslandQuery,
  useInsightMapQuery,
  useInsightUnlockMutation,
} from '@/hooks/queries/insights/use-insight-worldmap-query';
import { useKoansQuery } from '@/hooks/queries/insights/use-koan-query';
import { useToastStore } from '@/stores/use-toast-store';
import type { InsightMapArticle } from '@/types/insight-worldmap';
import styles from './sprint8-insights.module.css';

const resolveVisualState = (article: InsightMapArticle) => {
  if (article.state === 'READ') return 'READ';
  if (
    article.state === 'UNLOCKED' ||
    article.accessLevel === 'FREE' ||
    article.accessLevel === 'UNLOCKED'
  ) {
    return 'OPEN';
  }
  if (article.state === 'NEXT') return 'NEXT';
  // 비회원에게는 서버가 state 와 accessLevel 을 아예 내려주지 않는다
  // (2026-08-21 실측: 익명으로 /insight/islands/2 를 부르면 두 필드가 전부 null).
  // 그래서 첫 편까지 LOCKED 로 떨어져, 시안이 강조하도록 정한 "여기서 시작하는 글"이
  // 나머지 아홉 개와 똑같이 잠긴 모습으로 나왔다.
  // 비회원에게 "지금 열 수 있다"를 알려주는 신호는 해금 비용 0 하나뿐이므로 그것으로 본다.
  if (article.unlockCost === 0) return 'NEXT';
  return 'LOCKED';
};

export default function IslandArticleList({ slug }: { slug: string }) {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();
  const mapQuery = useInsightMapQuery();
  const islandId =
    mapQuery.data?.islands.find((item) => item.slug === slug)?.islandId ?? null;
  const islandQuery = useInsightIslandQuery(islandId);
  const island = islandQuery.data;
  const islandKoansQuery = useKoansQuery({ categorySlug: slug, size: 1 });
  const roomQuery = useCommunityRoomDetailQuery(island?.bridgeRoomId ?? 0);
  const unlockMutation = useInsightUnlockMutation();
  const showToast = useToastStore((state) => state.showToast);
  const [showTide, setShowTide] = useState(false);
  const [budgetEmpty, setBudgetEmpty] = useState(false);
  const budget = mapQuery.data?.readingBudget;
  const isMember =
    isAuthenticated || (!isHydrated && budget !== null && budget !== undefined);

  const openArticle = async (article: InsightMapArticle) => {
    const state = resolveVisualState(article);

    if (state === 'READ' || state === 'OPEN') {
      router.push(`/insights/${article.slug}`);
      return;
    }

    if (state === 'NEXT' && !isMember) {
      router.push(`/insights/${article.slug}`);
      return;
    }

    if (!isMember) {
      router.push(
        buildLoginPathForInsightCallback(
          `/insights/${article.slug}`,
          `/insights/land/${slug}`,
        ),
      );
      return;
    }

    if (state === 'NEXT') {
      const result = await unlockMutation.mutateAsync(article.documentId);
      if (!result.unlocked) {
        setBudgetEmpty(true);
        return;
      }
      if (result.cost > 0) {
        showToast('물길 1개를 썼어요', 'success');
      }
      router.push(`/insights/${article.slug}`);
    }
  };

  if (mapQuery.isPending || (islandId !== null && islandQuery.isPending)) {
    return (
      <main
        className={cn(styles.root, styles.land)}
        data-testid="island-detail"
      >
        <div className={styles.landBackdrop} aria-hidden />
        <div className={styles.landScrim} aria-hidden />
        <div className={styles.landInner} aria-busy="true">
          <Skeleton className={styles.landLoadingHead} />
          <Skeleton className={styles.landLoadingTide} />
          <div className={styles.landLoadingRows}>
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className={styles.landLoadingRow} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (mapQuery.isError || islandQuery.isError) {
    return (
      <main
        className={cn(styles.root, styles.land)}
        data-testid="island-detail"
      >
        <div className={styles.landBackdrop} aria-hidden />
        <div className={styles.landScrim} aria-hidden />
        <div className={styles.landInner}>
          <div
            className={cn(styles.stateCard, styles.stateCardDark)}
            role="alert"
          >
            <b>이 땅의 물길을 불러오지 못했습니다</b>
            <p>
              연결이 끊겼거나 서버가 잠시 답하지 않았습니다. 계속 안 되면 바다로
              돌아가 다른 땅을 먼저 볼 수 있습니다.
            </p>
            <Button
              type="button"
              color="primary"
              size="large"
              onClick={async () => {
                await Promise.all([
                  mapQuery.refetch(),
                  islandId !== null ? islandQuery.refetch() : Promise.resolve(),
                ]);
              }}
            >
              다시 불러오기
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!island) {
    return (
      <main className={styles.root} data-testid="island-detail">
        <div className={styles.stateCard} role="alert">
          <b>이 개척지를 찾지 못했습니다</b>
          <p>주소가 바뀌었거나 아직 열리지 않은 땅입니다.</p>
          <Link href="/insights" className={styles.stateAction}>
            바다에서 다시 고르기
          </Link>
        </div>
      </main>
    );
  }

  const readCount = island.progress?.read ?? 0;
  const balance = budget?.balance ?? 0;
  const dailyCap = budget?.dailyCap ?? 5;

  return (
    <main className={cn(styles.root, styles.land)} data-testid="island-detail">
      <IslandEnterTracker islandSlug={island.slug} islandName={island.name} />
      <div className={styles.landBackdrop} aria-hidden />
      <div className={styles.landScrim} aria-hidden />
      <div className={styles.landInner}>
        <Link href="/insights" className={styles.back}>
          ← 바다로
        </Link>
        <div className={styles.landHead}>
          <Image
            unoptimized
            src={getIslandArt(island.slug)}
            alt=""
            width={132}
            height={132}
            className={styles.landArt}
          />
          <div>
            <h1 className={styles.landTitle}>{island.name}</h1>
            <p className={styles.landStatus}>
              {isMember
                ? `개념글 ${island.articles.length}편 중 ${readCount}편 열림`
                : `개념글 ${island.articles.length}편`}
            </p>
            <p className={styles.landExplorers}>
              {island.explorerCount}명이 지나간 땅
            </p>
          </div>
        </div>

        {(budget || !isMember) && (
          <div className={styles.tide}>
            <span className={styles.tideDots} aria-hidden>
              {Array.from({ length: dailyCap }, (_, index) => (
                <i
                  key={index}
                  className={cn(
                    styles.tideDot,
                    index < (isMember ? balance : dailyCap) && styles.tideDotOn,
                  )}
                />
              ))}
            </span>
            <span className={styles.tideText}>
              <span data-testid="insight-reading-balance">
                {isMember
                  ? budgetEmpty || balance === 0
                    ? '오늘의 물때를 모두 썼습니다'
                    : `오늘 물길 ${balance}개가 남아 있습니다`
                  : '로그인하면 하루 다섯 물길이 생깁니다'}
              </span>
              <small>
                {isMember
                  ? '내일 아침 여섯 시에 다시 찹니다. 화두는 지금도 읽을 수 있어요.'
                  : '첫 편은 물길을 쓰지 않습니다. 여기서 시작하세요.'}
              </small>
            </span>
            <Button
              type="button"
              color="outlined"
              size="medium"
              className={cn(
                styles.tideHelp,
                'bg-transparent hover:bg-transparent active:bg-transparent',
              )}
              onClick={() => setShowTide(true)}
            >
              물때란
            </Button>
          </div>
        )}

        {island.articles.length === 0 ? (
          <div className={cn(styles.stateCard, styles.stateCardDark)}>
            <b>이 땅에는 아직 개념글이 없습니다</b>
            <p>
              개척지는 열렸지만 물길이 아직 놓이지 않았습니다. 그동안 이 땅에서
              나온 화두는 물길 없이 읽을 수 있습니다.
            </p>
            <Link
              href={`/insights/koans?category=${island.slug}`}
              className={styles.stateAction}
            >
              이 땅의 화두 먼저 읽기
            </Link>
          </div>
        ) : (
          <div className={styles.documents}>
            {island.articles.map((article, index) => {
              const state = resolveVisualState(article);
              const blocked = state === 'LOCKED' && isMember;
              return (
                <Button
                  key={article.documentId}
                  type="button"
                  color="outlined"
                  size="medium"
                  disabled={blocked || unlockMutation.isPending}
                  onClick={() => openArticle(article)}
                  className={cn(
                    styles.document,
                    'h-auto w-full justify-start',
                    state === 'READ' && styles.documentRead,
                    state === 'NEXT' && styles.documentNext,
                    state === 'LOCKED' && styles.documentLocked,
                  )}
                  data-testid={`article-${article.slug}`}
                >
                  <span className={styles.documentNumber}>
                    {state === 'READ' ? '✓' : index + 1}
                  </span>
                  <span className="text-left">
                    <span className={styles.documentTitle}>
                      {article.title}
                    </span>
                    {state !== 'LOCKED' && (
                      <span className={styles.documentDescription}>
                        {article.description}
                      </span>
                    )}
                    {state === 'READ' || state === 'OPEN' ? (
                      <span className={styles.documentTag}>열었음</span>
                    ) : state === 'NEXT' && !isMember ? (
                      // 시안은 비회원에게도 시작점을 알려준다. 로그인부터 요구하지 않는다
                      // (승인 시안 sprint8-app-v10-opus5.html: guest 이면 열쇠 칩 대신
                      //  "여기서 시작합니다" 태그). 이 분기를 비회원 검사보다 뒤에 두었더니
                      //  첫 편에도 "로그인하면 이어서 엽니다"가 붙었다.
                      <span className={styles.documentTag}>
                        여기서 시작합니다
                      </span>
                    ) : !isMember ? (
                      <span className={styles.documentTag}>
                        로그인하면 이어서 엽니다
                      </span>
                    ) : state === 'NEXT' ? (
                      <span className={styles.documentKey}>
                        물길 하나로 열립니다
                      </span>
                    ) : (
                      <span className={styles.documentTag}>
                        {isMember
                          ? '앞 물길이 열려야 닿습니다'
                          : '로그인하면 이어서 엽니다'}
                      </span>
                    )}
                  </span>
                </Button>
              );
            })}
          </div>
        )}

        {island.articles.length > 0 && (
          <div className={styles.crossings}>
            <Link
              href={`/insights/koans?category=${island.slug}`}
              className={styles.crossing}
            >
              이 땅에서 나온 화두{' '}
              <small>
                {islandKoansQuery.data
                  ? `${islandKoansQuery.data.totalElements}개 · `
                  : ''}
                물길 없이 읽습니다
              </small>
            </Link>
            {island.bridgeRoomId ? (
              <Link
                href={`/community/rooms/${island.bridgeRoomId}?from=${encodeURIComponent(island.slug)}`}
                className={styles.crossing}
              >
                이 땅의 공부방
                {roomQuery.data && (
                  <small>
                    {roomQuery.data.name} · {roomQuery.data.memberCount}명
                  </small>
                )}
              </Link>
            ) : (
              <span className={styles.crossing}>
                공부방 준비 중 <small>열리면 여기에 뜹니다</small>
              </span>
            )}
          </div>
        )}
      </div>

      {showTide && (
        <div className={styles.modalBackdrop}>
          <section
            className="mx-auto w-full max-w-xl rounded-t-250 bg-background-default p-250 sm:p-350"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tide-title"
          >
            <h2 id="tide-title" className="font-designer-20b text-text-strong">
              물때는 어떻게 차오르나
            </h2>
            <p className="font-designer-13r mt-100 leading-relaxed text-text-subtle">
              개념글은 한 편을 열 때 물길 하나를 씁니다. 화두는 물길을 쓰지
              않습니다. 언제든 몇 개든 읽을 수 있습니다.
            </p>
            <ul className="font-designer-13m mt-175 space-y-125 text-text-default">
              <li>매일 아침 여섯 시에 다섯으로 다시 찹니다.</li>
              <li>어느 땅이든 첫 개념글은 물길을 쓰지 않습니다.</li>
              <li>돈으로 더 사는 길은 없습니다.</li>
              <li>물때와 개척 기록은 나만 봅니다.</li>
            </ul>
            <Button
              type="button"
              color="secondary"
              size="large"
              className="font-designer-14b mt-250 w-full rounded-150 bg-fill-neutral-strong-default text-text-inverse hover:bg-fill-neutral-strong-default active:bg-fill-neutral-strong-default"
              onClick={() => setShowTide(false)}
            >
              알겠습니다
            </Button>
          </section>
        </div>
      )}
    </main>
  );
}
