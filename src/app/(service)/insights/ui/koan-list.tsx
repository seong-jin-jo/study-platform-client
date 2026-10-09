'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Button from '@/components/common/ui/button';
import { Menu } from '@/components/common/ui/menu';
import { useKoansQuery } from '@/hooks/queries/insights/use-koan-query';
import type { KoanSummary } from '@/types/insights/koan';
import styles from './sprint8-insights.module.css';
import {
  getVisibleKoans,
  KOAN_INITIAL_VISIBLE_COUNT,
  KOAN_LOAD_MORE_COUNT,
  KOAN_QUERY_SIZE,
  type KoanSort,
  sortKoans,
} from './sprint8-v10-state';

const categories = [
  { label: '전체', slug: undefined },
  { label: '입문', slug: 'beginner' },
  { label: '중급', slug: 'intermediate' },
  { label: 'CS', slug: 'cs' },
  { label: '배포·운영', slug: 'dep' },
  { label: 'AI 에이전트', slug: 'ai' },
];

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(
    new Date(value),
  );

const kstDateKey = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

function KoanRow({ koan }: { koan: KoanSummary }) {
  return (
    <Link href={`/insights/koans/${koan.koanId}`} className={styles.listRow}>
      <div className={styles.listQuestion}>{koan.question}</div>
      <div className={styles.listMeta}>
        <span className={styles.listBadge}>{koan.categoryName}</span>
        <span>{formatShortDate(koan.publishedAt)}</span>
      </div>
      <div className={styles.listCount}>
        {koan.answerCount > 0 ? (
          <>
            보완 <em>{koan.answerCount}</em>
          </>
        ) : (
          '아직 없음'
        )}
      </div>
    </Link>
  );
}

export default function KoanList({ categorySlug }: { categorySlug?: string }) {
  const query = useKoansQuery({ categorySlug, size: KOAN_QUERY_SIZE });
  const [sort, setSort] = useState<KoanSort>('recent');
  const [visibleCount, setVisibleCount] = useState(KOAN_INITIAL_VISIBLE_COUNT);
  const latest = query.data?.items[0];
  const today =
    latest && kstDateKey(latest.publishedAt) === kstDateKey(new Date())
      ? latest
      : undefined;
  const past = useMemo(
    () => sortKoans(query.data?.items.slice(today ? 1 : 0) ?? [], sort),
    [query.data?.items, sort, today],
  );
  const pastTotal = Math.max(
    past.length,
    (query.data?.totalElements ?? 0) - (today ? 1 : 0),
  );
  const visiblePast = getVisibleKoans(past, visibleCount);
  const koanCountByCategory = new Map<string, number>();
  query.data?.items.forEach((koan) => {
    koanCountByCategory.set(
      koan.categoryName,
      (koanCountByCategory.get(koan.categoryName) ?? 0) + 1,
    );
  });

  return (
    <main className={styles.root} data-testid="koan-list">
      <div className={styles.listPage}>
        <div className={styles.listMain}>
          <div className={styles.listLead}>
            <h1>화두</h1>
            <p>
              정복하는 관문이 아니라 <b>품고 다니며 굴리는 물음</b>입니다. 답은
              이미 올라와 있고, 우리가 원하는 건 그 답의 빈틈입니다.
            </p>
          </div>

          {query.isPending && (
            <div className={styles.stateCard} aria-busy="true">
              <b>화두를 불러오는 중입니다</b>
              <p>물음과 보완 기록이 도착할 자리를 준비하고 있습니다.</p>
            </div>
          )}
          {query.isError && (
            <div className={styles.stateCard} role="alert">
              <b>화두를 불러오지 못했습니다</b>
              <p>
                목록을 가져오는 도중 연결이 끊겼습니다. 다시 시도하면 대개 바로
                열립니다.
              </p>
              <Button
                type="button"
                color="primary"
                size="large"
                onClick={() => query.refetch()}
              >
                다시 불러오기
              </Button>
            </div>
          )}
          {query.data?.items.length === 0 && (
            <div className={styles.stateCard}>
              <b>첫 화두를 준비하고 있습니다</b>
              <p>
                그동안 개척지의 개념글을 먼저 볼 수 있습니다. 첫 물음이 올라오면
                이 자리에 쌓입니다.
              </p>
              <Link href="/insights" className={styles.stateAction}>
                개척지 먼저 보기
              </Link>
            </div>
          )}

          {!query.isPending && !query.isError && !today && past.length > 0 && (
            <div className={styles.empty}>이번 주는 쉬어갑니다</div>
          )}

          {today && (
            <section className={styles.listHero}>
              <div className={styles.listHeroKicker}>
                <span aria-hidden /> 이번 화두 ·{' '}
                {formatShortDate(today.publishedAt)}
              </div>
              <h2>{today.question}</h2>
              <div className={styles.listHeroMeta}>
                <span>{today.categoryName}</span>
                {today.viewCount}명이 봤고 {today.answerCount}명이 보탰습니다
              </div>
              <div className={styles.listHeroActions}>
                <Link href={`/insights/koans/${today.koanId}`}>
                  답을 보고 빈틈 메우기
                </Link>
                <Button
                  type="button"
                  color="outlined"
                  size="large"
                  disabled
                  title="구독 API 연결 후 활성화됩니다"
                >
                  메일로 받기
                </Button>
              </div>
              <p>
                답은 AI가 정리한 초안이고, 사람이 검토해 올립니다. 틀린 부분은
                저희가 고치고 그 기록을 남깁니다.
              </p>
            </section>
          )}

          {!query.isPending && !query.isError && query.data && (
            <section className={styles.listAxis}>
              <div className={styles.listAxisHead}>
                <h3>어디서 막혔나요</h3>
                <span>
                  카테고리를 고르면 그 분야의 화두·개념글·지도가 함께 열립니다
                </span>
              </div>
              <div className={styles.listChips}>
                {categories.map((category) => (
                  <Link
                    key={category.label}
                    href={
                      category.slug
                        ? `/insights/koans?category=${category.slug}`
                        : '/insights/koans'
                    }
                    aria-current={
                      category.slug === categorySlug ||
                      (!category.slug && !categorySlug)
                        ? 'page'
                        : undefined
                    }
                  >
                    {category.label}
                  </Link>
                ))}
              </div>
              {categorySlug && (
                <div className={styles.listBridge}>
                  <div>
                    <b>{latest?.categoryName ?? categorySlug}</b>
                    <span>개념글과 화두를 한 땅에서 이어 봅니다</span>
                  </div>
                  <Link href={`/insights/land/${categorySlug}`}>
                    {latest?.categoryName ?? categorySlug} 전체 보기
                  </Link>
                </div>
              )}
            </section>
          )}

          <p className={styles.listFoot}>
            보완 0건은 숫자 대신 문장으로 적습니다. 개인 순위·랭킹은 표시하지
            않습니다.
          </p>
          {past.length > 0 && (
            <section className={styles.listWrap}>
              <div className={styles.listHeader}>
                <b>지난 화두</b>
                <span>{pastTotal}건</span>
                {past.length > 2 && (
                  <div className={styles.listSort}>
                    <Menu.Root>
                      <Menu.Trigger>
                        <Button
                          type="button"
                          color="outlined"
                          size="large"
                          className={styles.listSortTrigger}
                          aria-label="지난 화두 정렬"
                        >
                          {sort === 'recent'
                            ? '최근에 올라온 순'
                            : '보완이 많은 순'}
                        </Button>
                      </Menu.Trigger>
                      <Menu.Content align="end">
                        <Menu.RadioGroup
                          value={sort}
                          onValueChange={(value) => {
                            setSort(value as KoanSort);
                            setVisibleCount(KOAN_INITIAL_VISIBLE_COUNT);
                          }}
                        >
                          <Menu.RadioItem value="recent">
                            최근에 올라온 순
                          </Menu.RadioItem>
                          <Menu.RadioItem value="answers">
                            보완이 많은 순
                          </Menu.RadioItem>
                        </Menu.RadioGroup>
                      </Menu.Content>
                    </Menu.Root>
                  </div>
                )}
              </div>
              {visiblePast.map((koan) => (
                <KoanRow key={koan.koanId} koan={koan} />
              ))}
              {visiblePast.length < past.length && (
                <Button
                  type="button"
                  color="outlined"
                  size="large"
                  className={styles.listLoadMore}
                  onClick={() =>
                    setVisibleCount((count) => count + KOAN_LOAD_MORE_COUNT)
                  }
                >
                  {past.length - visiblePast.length}개 더 보기
                </Button>
              )}
            </section>
          )}
        </div>

        <aside className={styles.listRail}>
          <div className={styles.listRailCard}>
            <h4>화두는 어떻게 굴러가나요</h4>
            <p>
              물음 하나가 올라오면 AI가 정리한 초안이 함께 붙습니다. 우리가
              기다리는 건 정답이 아니라 <b>당신 현장에서는 어떻게 다른지</b>
              입니다.
            </p>
            <div className={styles.listPace} title="이번 주 발행 리듬">
              {Array.from({ length: 5 }, (_, index) => (
                <i
                  key={index}
                  className={index < 2 ? styles.listPaceOn : undefined}
                />
              ))}
            </div>
            <p className={styles.listPaceText}>
              이번 주 2건 올라옴 · 주 2건 정도의 페이스
            </p>
          </div>
          <div className={styles.listRailCard}>
            <h4>메일로 받아보기</h4>
            <p>
              화두 전문과 답까지 메일 안에서 끝납니다. 사이트에 들어오는 건
              토론하고 싶을 때만.
            </p>
            <Button
              type="button"
              color="outlined"
              size="medium"
              className={styles.listMailButton}
              disabled
              title="구독 API 연결 후 활성화됩니다"
            >
              화두 메일 구독하기
            </Button>
          </div>
          <div className={styles.listRailCard}>
            <h4>분야별로 들어가기</h4>
            <p>한 분야를 고르면 그 안에서 화두·개념글·지도가 함께 열립니다.</p>
            <div>
              {categories.slice(1).map((category) => (
                <Link
                  key={category.label}
                  href={`/insights/koans?category=${category.slug}`}
                >
                  {category.label}
                  <small>
                    화두 {koanCountByCategory.get(category.label) ?? 0}
                  </small>
                </Link>
              ))}
              <Link href="/insights/land/db">
                데이터베이스 <span>→</span>
              </Link>
              <Link href="/insights">
                전체 바다 <span>→</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
