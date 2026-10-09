'use client';

import { sendGTMEvent } from '@next/third-parties/google';
import { Check, ThumbsUp } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  addInsightSectionComment,
  asInsightSectionReaction,
  canSubmitInsightSectionComment,
  clampInsightSectionComment,
  findPollOptionIndex,
  formatReactionCountLabel,
  getInsightPoll,
  getInsightSectionReactions,
  getInsightTipSaved,
  INSIGHT_SECTION_COMMENT_LOGIN_PROMPT,
  INSIGHT_SECTION_COMMENT_MAX_LENGTH,
  INSIGHT_TIP_LOGIN_PROMPT,
  type InsightPollSnapshot,
  type InsightSectionComment,
  type InsightSectionReactionKind,
  type InsightSectionReactionSnapshot,
  insightPollFooterMessage,
  pollOptionCount,
  pollOptionKey,
  sectionReactionToken,
  setInsightSectionReaction,
  setInsightTipSaved,
  voteInsightPoll,
} from '@/api/endpoints/insights/insight-social-api';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import ToggleButton from '@/components/common/ui/toggle/button';
import {
  prefersReducedMotion,
  triggerHalfwayCelebration,
} from '@/components/insights/article-celebration';
import { resolvePersonalArticleInteraction } from '@/components/insights/insight-article-actions';
import SaveResourceButton from '@/components/saved-resource/save-resource-button';
import {
  useInsightHelpfulMutation,
  useInsightMapQuery,
} from '@/hooks/queries/insights/use-insight-worldmap-query';
import { useToastStore } from '@/stores/use-toast-store';
import { SAVED_RESOURCE_TYPE } from '@/types/saved-resource';

// 인사이트 용어글 상세 v2 승격 컴포넌트 모음.
// 원고 안 관례 HTML 블록(zo-*)을 blog-detail-page.tsx 의 react-markdown
// components 맵이 이 파일의 컴포넌트로 승격한다. 계약 정본은
// docs/design/prototype/insight-article-v2-spec.md §2·§3 와
// docs/insight-social-contract-v1.md. localStorage 키는 전부 zo: 접두(§7).
// 서버 집계가 오면 실수치를 보이고, 실패 시에만 localStorage 폴백.

function readLocal(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // 사파리 프라이빗 모드 등 storage 접근 불가 시 조용히 무시한다.
  }
}

// ── useInViewOnce (핫픽스 2026-09-17 ask 5) ───────────────────────────────
// "GIF 같은 동적인 것" — 자산 없이 IntersectionObserver + CSS로 낸다.
// 한 번 뷰포트에 들어오면 observer 를 끊어 두 번째부터는 재생하지 않는다.
// prefers-reduced-motion 이면 애니메이션 없이 바로 "보인 것"으로 친다(CSS
// 트랜지션이 아예 안 걸리므로 그냥 최종 상태로 렌더된다).
export function useInViewOnce<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  boolean,
] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

// ── ArticleHeroSlots ────────────────────────────────────────────────────
export function ArticleHeroSlots({
  before,
  after,
}: {
  before: React.ReactNode;
  after: React.ReactNode;
}) {
  return (
    // lg: 대신 @container 쿼리(부모 <article>의 @container, 핫픽스
    // 2026-09-17 ask 3) — 본문 열 자신의 렌더 폭이 640px 이상이면 2열.
    // mb 를 300(24px, 예전 400/32px)으로 줄였다 — 히어로 하단 여백 폴리시
    // (핫픽스 2026-09-17 ask 1). 나머지 여백은 h2 자신의 상단 마진이 맡는다.
    <div className="mt-400 mb-300 grid grid-cols-1 gap-200 @[640px]:grid-cols-2">
      <div className="rounded-200 border border-border-subtle bg-background-alternative p-200">
        <p className="font-designer-13b mb-100 text-text-subtle">읽기 전</p>
        <div className="font-designer-14r text-text-default">{before}</div>
      </div>
      <div className="zo-hero-after animate-[zo-border-pulse_1.8s_ease-out_1] rounded-200 border border-border-brand bg-background-accent-rose-subtle p-200 motion-reduce:animate-none">
        <p className="font-designer-13b mb-100 text-text-brand">읽고 나면</p>
        <div className="font-designer-14r text-text-default">{after}</div>
      </div>
      {/* 첫 로드에 한 번 은은히 펄스(핫픽스 2026-09-17 ask 5-c). CSS
          variables 로 색을 넘겨(하드코딩 hex 대신) 브랜드 토큰만 쓴다. */}
      <style>{`
        @keyframes zo-border-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(246, 61, 104, 0); }
          40% { box-shadow: 0 0 0 4px rgba(246, 61, 104, 0.25); }
        }
      `}</style>
    </div>
  );
}

// ── ArticleTopActions (핫픽스 2026-09-17 ask 2) ───────────────────────────
// 시안처럼 히어로 두 칸 바로 아래에 저장·도움됐어요를 둔다. 하단
// InsightArticleActions 와 "같은 상태를 공유"해야 하므로 별도 로컬 상태를
// 두지 않고, 그 컴포넌트와 똑같이 useInsightMapQuery/useInsightHelpfulMutation
// 을 이 컴포넌트 자신 안에서 호출한다 — TanStack Query 가 같은 queryKey 로
// 캐시를 공유하므로 한쪽에서 mutate 하면 다른 쪽도 그 캐시 갱신으로 자동
// 리렌더된다(추가 배선 없이 "공유"가 성립). SaveResourceButton 도 같은
// resourceKey 로 이미 쿼리 캐시를 공유하는 컴포넌트라 그대로 재사용한다.
export function ArticleTopActions({
  articleSlug,
  documentId,
  memberId,
}: {
  articleSlug: string;
  documentId: string;
  memberId?: number;
}) {
  const map = useInsightMapQuery();
  const helpful = useInsightHelpfulMutation();
  const showToast = useToastStore((state) => state.showToast);

  const article = map.data?.islands
    .flatMap((island) => island.articles)
    .find((item) => item.documentId === documentId);
  const personalInteraction = resolvePersonalArticleInteraction(article);

  const toggleHelpful = () => {
    if (!memberId) {
      showToast('로그인하면 도움됨을 남길 수 있어요.', 'error');
      return;
    }
    if (!personalInteraction) {
      showToast('읽기 상태를 다시 불러오고 있어요.', 'error');
      return;
    }
    const nextHelpful = !personalInteraction.helpfulByMe;
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

  return (
    <div className="acts flex items-center gap-75">
      <SaveResourceButton
        resourceKey={documentId}
        resourceType={SAVED_RESOURCE_TYPE.INSIGHT_ARTICLE}
        showLabel
      />
      <ToggleButton
        pressed={personalInteraction?.helpfulByMe ?? false}
        disabled={
          helpful.isPending || (memberId !== undefined && !personalInteraction)
        }
        onPressedChange={toggleHelpful}
        size="sm"
        variant="round"
        // 하단 InsightArticleActions 에도 같은 문구의 "도움됐어요" 버튼이
        // 있어 Playwright getByRole(name:'도움됐어요', exact) 가 두 개를
        // 찾아 strict-mode 위반을 냈다(SPRINT8 TC-S8-GH-018 실측, 2026-09-17
        // CI). aria-label 로 접근성 이름만 구분하고 화면 문구는 시안대로
        // 그대로 "도움됐어요"를 보여준다.
        aria-label="상단 도움됐어요"
        className={cn(
          'font-designer-12b inline-flex items-center gap-50 border px-125 py-75',
          personalInteraction?.helpfulByMe
            ? 'data-[state=on]:border-border-brand data-[state=on]:bg-background-accent-rose-subtle data-[state=on]:text-text-brand'
            : 'data-[state=off]:border-border-subtle data-[state=off]:bg-background-default data-[state=off]:text-text-subtle',
        )}
      >
        <ThumbsUp className="size-150" aria-hidden />
        도움됐어요
      </ToggleButton>
    </div>
  );
}

// ── SocialProofLine (§3.1) ──────────────────────────────────────────────
export function SocialProofLine({
  viewCount,
  helpfulCount,
}: {
  viewCount: number;
  helpfulCount: number;
}) {
  let text: string;
  let dotClassName: string;

  if (viewCount === 0) {
    text = '조회 집계 전';
    dotClassName = 'bg-fill-neutral-default-default';
  } else if (viewCount < 50) {
    text = '아직 조회를 모으는 중이에요';
    dotClassName = 'bg-fill-neutral-default-default';
  } else {
    const viewText = `지금까지 ${viewCount.toLocaleString('ko-KR')}명이 읽었어요`;
    text =
      helpfulCount >= 5
        ? `${viewText} · ${helpfulCount.toLocaleString('ko-KR')}명이 도움됐대요`
        : viewText;
    dotClassName = 'bg-fill-success-default-default';
  }

  return (
    <p className="font-designer-13m mt-150 inline-flex items-center gap-75 text-text-subtle">
      <span
        aria-hidden
        className={cn(
          'inline-block size-75 rounded-full tabular-nums',
          dotClassName,
        )}
      />
      <span className="tabular-nums">{text}</span>
    </p>
  );
}

// ── ArticleToc + 스크롤스파이 훅 (§3.5) ──────────────────────────────────
export interface TocItem {
  id: string;
  text: string;
}

export function useTocActiveIndex(items: TocItem[]) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || items.length === 0) return;

    const compute = () => {
      let current = 0;
      for (let i = 0; i < items.length; i += 1) {
        const el = document.getElementById(items[i].id);
        if (!el) continue;
        if (el.offsetTop - 80 <= window.scrollY) current = i;
      }
      setActiveIndex(current);
    };

    // rAF 스로틀: 스크롤 이벤트 빈도만큼 setState 하지 않고 프레임당 1회로 줄인다.
    let ticking = false;
    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        compute();
        ticking = false;
      });
    };

    compute();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [items]);

  return activeIndex;
}

// activeIndex 는 컴포넌트 스스로 관리한다(성능 핫픽스, 2026-09-16) — 예전엔
// 부모(BlogDetailPage)가 useTocActiveIndex 를 호출해 prop 으로 내려줬는데,
// 그 스크롤 setState 가 부모 fiber 에서 일어나 부모 전체(+ 그 안의
// react-markdown 본문)를 매 스크롤마다 재렌더시켰다. 이제는 이 리프
// 컴포넌트 자신의 fiber 에 상태가 갇힌다.
export function ArticleToc({
  items,
  variant,
  note,
}: {
  items: TocItem[];
  variant: 'card' | 'rail';
  note?: string;
}) {
  const activeIndex = useTocActiveIndex(items);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="목차"
      className={cn(
        variant === 'card' &&
          'zo-toc-card my-300 rounded-200 border border-border-subtle bg-background-alternative p-200 lg:hidden',
        variant === 'rail' &&
          // sticky 는 이제 부모 <aside class="rail"> 하나가 전담한다
          // (읽기 진행 카드 + 목차를 한 덩어리로 고정, 회장 지시
          // 2026-09-17). 이 안에서 또 sticky 를 걸면 이중 오프셋이 생긴다.
          'zo-toc-rail hidden max-h-[60vh] overflow-y-auto rounded-200 border border-border-subtle bg-background-default p-200 lg:block',
      )}
    >
      <ol className="space-y-75">
        {items.map((item, index) => {
          const isCurrent = index === activeIndex;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isCurrent ? 'location' : undefined}
                className={cn(
                  'font-designer-13m flex min-h-550 items-center gap-100 rounded-100 px-100 leading-snug',
                  isCurrent
                    ? 'bg-background-accent-rose-subtle text-text-brand'
                    : 'text-text-subtle hover:bg-background-alternative',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-350 shrink-0 items-center justify-center rounded-full font-designer-12b',
                    isCurrent
                      ? 'bg-fill-brand-default-default text-text-inverse'
                      : 'bg-fill-neutral-strong-default text-text-inverse',
                  )}
                >
                  {index + 1}
                </span>
                <span>{item.text}</span>
              </a>
            </li>
          );
        })}
      </ol>
      {note ? (
        <p className="font-designer-12r mt-150 border-t border-border-subtle pt-150 text-text-subtlest">
          {note}
        </p>
      ) : null}
    </nav>
  );
}

// pct 는 `.zo-article-body` 시작~끝 기준(문서 전체 아님). ReadingProgressBar
// (blog-detail-page.tsx)와 ReadMeter(아래)가 각자 이 훅을 자기 안에서
// 호출한다 — 상태를 부모(BlogDetailPage)로 끌어올리면 스크롤마다 부모 전체가
// 재렌더돼 react-markdown 본문이 통째로 언마운트되는 성능 사고가 난다(2026-09-16
// 운영 실측: 스크롤 20틱 DOM 변이 8,550건, 복사 버튼 노드 교체).
export function useArticleReadProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const computeProgress = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const body = document.querySelector('.zo-article-body');
      if (body) {
        const rect = body.getBoundingClientRect();
        const bodyTop = rect.top + scrollTop;
        const bodyHeight = rect.height - doc.clientHeight;
        const pct =
          bodyHeight > 0
            ? Math.min(
                100,
                Math.max(0, ((scrollTop - bodyTop) / bodyHeight) * 100),
              )
            : scrollTop > bodyTop
              ? 100
              : 0;
        setProgress(pct);
        return;
      }
      const scrollable =
        (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
      const pct =
        scrollable > 0
          ? Math.min(100, Math.max(0, (scrollTop / scrollable) * 100))
          : 0;
      setProgress(pct);
    };

    // rAF 스로틀: 스크롤 이벤트가 프레임보다 훨씬 자주 발생하므로 리스너
    // 자체는 매번 불려도 setState(=리렌더)는 프레임당 최대 1회로 줄인다.
    let ticking = false;
    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        computeProgress();
        ticking = false;
      });
    };

    computeProgress();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  return progress;
}

// ── ArticleProgressCelebration (핫픽스 2026-09-17 ask 2) ──────────────────
// "로딩바 티가 안 나. 절반쯤 내렸을 때 응원" — 시각 출력은 없고(null 렌더),
// 진행률이 50%를 처음 넘는 순간 세션당 1회 토스트만 낸다. 100%(완독) 축하는
// 여기서 다루지 않는다 — 기존 markInsightRead sentinel(insight-article-actions.tsx)
// 과 합쳐야 한다는 지시라 그쪽에서 triggerReadCelebration 을 호출한다.
export function ArticleProgressCelebration({
  documentId,
  halfwayNote,
}: {
  documentId: string;
  halfwayNote?: string;
}) {
  const progress = useArticleReadProgress();
  const firedRef = useRef(false);

  useEffect(() => {
    if (progress >= 50 && !firedRef.current) {
      firedRef.current = true;
      triggerHalfwayCelebration(documentId, halfwayNote);
    }
  }, [progress, documentId, halfwayNote]);

  return null;
}

// ── ReadMeter (레일, §1) ─────────────────────────────────────────────────
export function ReadMeter({ minutes }: { minutes: number }) {
  const progress = useArticleReadProgress();
  const pct = Math.round(progress);
  const leftMinutes = Math.ceil((minutes * (100 - pct)) / 100);
  return (
    <div className="hidden rounded-200 border border-border-subtle bg-background-alternative p-200 lg:block">
      <p className="font-designer-13b text-text-strong">읽기 진행</p>
      <div className="mt-100 h-75 w-full overflow-hidden rounded-full bg-fill-neutral-default-default">
        <div
          className="h-full rounded-full bg-fill-brand-default-default transition-[width] duration-80 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-designer-12r mt-75 tabular-nums text-text-subtle">
        {pct >= 100
          ? '다 읽었어요'
          : leftMinutes <= 1
            ? '1분 안 남았어요'
            : `약 ${leftMinutes}분 남음`}
      </p>
    </div>
  );
}

// ── ArticleChat (§3.3) ───────────────────────────────────────────────────
export function ArticleChat({
  title,
  user,
  assistant,
}: {
  title?: string;
  user: string;
  assistant: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const [chatRef, chatInView] = useInViewOnce<HTMLDivElement>();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(user);
      setCopied(true);
      showToast(
        '지시문을 복사했어요. 에이전트 대화창에 붙여넣으세요.',
        'success',
      );
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('복사가 막혔어요. 말풍선을 드래그해서 복사해 주세요.', 'error');
    }
  };

  return (
    <div
      ref={chatRef}
      className={cn(
        'zo-chat my-400 overflow-hidden rounded-200 border border-border-subtle bg-[#faf9f5]',
        chatInView && 'is-inview',
      )}
    >
      <div className="flex items-center justify-between border-b border-[#e8e5d8] px-200 py-125">
        <span className="font-designer-13b truncate text-[#181d27]">
          {title ?? '에이전트 대화'}
        </span>
        <ToggleButton
          pressed={copied}
          onPressedChange={handleCopy}
          size="sm"
          variant="round"
          aria-label={`${title ?? '에이전트 대화'} 지시문 복사`}
          className={cn(
            'font-designer-12b shrink-0 whitespace-nowrap border bg-transparent px-150 py-50 active:scale-95',
            copied
              ? 'border-fill-success-default-default text-fill-success-default-default'
              : 'border-[#d97757] text-[#d97757]',
          )}
        >
          {copied ? '복사했어요' : '지시문 복사'}
        </ToggleButton>
      </div>
      <div className="space-y-150 p-200">
        {/* (b) 뷰포트 진입 시 user 말풍선이 타이핑 커서로 드러난 뒤(1.2초)
            assistant 첫 줄이 페이드인(핫픽스 2026-09-17 ask 5-b). GIF 없이
            clip-path 애니메이션으로 "드러나는" 느낌만 낸다 — 실제 글자
            단위 타이핑은 접근성상 스크린리더가 잘라 읽을 위험이 있어
            피했다(텍스트 자체는 항상 DOM에 온전히 존재). */}
        <p className="zo-chat-user font-designer-14r ml-auto max-w-4/5 rounded-150 bg-[#d97757] px-150 py-100 whitespace-pre-wrap text-white">
          {user}
        </p>
        <div className="zo-chat-assistant font-designer-14r max-w-4/5 rounded-150 bg-[#e8e5d8] px-150 py-100 text-[#181d27]">
          {assistant}
        </div>
      </div>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .zo-chat .zo-chat-user {
            clip-path: inset(0 100% 0 0);
          }
          .zo-chat.is-inview .zo-chat-user {
            animation: zo-chat-user-reveal 1.2s steps(24, end) forwards;
          }
          .zo-chat .zo-chat-assistant {
            opacity: 0;
          }
          .zo-chat.is-inview .zo-chat-assistant {
            animation: zo-chat-assistant-fade 0.5s ease-out 1.2s forwards;
          }
          @keyframes zo-chat-user-reveal {
            to { clip-path: inset(0 0 0 0); }
          }
          @keyframes zo-chat-assistant-fade {
            to { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}

// ── ArticleTip (§3, 꿀팁 저장) ────────────────────────────────────────────
export function ArticleTip({
  docId,
  tipId,
  isMember,
  children,
}: {
  docId: string;
  tipId: string;
  isMember: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `zo:tip:${docId}:${tipId}`;
  const [saved, setSaved] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    const localSaved = readLocal(storageKey) === 'true';
    setSaved(localSaved);
    if (!isMember) return undefined;

    let cancelled = false;
    getInsightTipSaved(docId, tipId)
      .then(async (result) => {
        if (cancelled) return;
        if (!result) {
          setSaved(localSaved);
          return;
        }
        if (!result.saved && localSaved) {
          const migrated = await setInsightTipSaved(docId, tipId, true);
          if (cancelled) return;
          setSaved(migrated.saved);
          writeLocal(storageKey, migrated.saved ? 'true' : null);
          return;
        }
        setSaved(result.saved);
        writeLocal(storageKey, result.saved ? 'true' : null);
      })
      .catch(() => {
        if (!cancelled) setSaved(localSaved);
      });

    return () => {
      cancelled = true;
    };
  }, [docId, isMember, storageKey, tipId]);

  const handleSave = () => {
    if (!isMember) {
      showToast(INSIGHT_TIP_LOGIN_PROMPT, 'error');
      return;
    }
    const next = !saved;
    setSaved(next);
    writeLocal(storageKey, next ? 'true' : null);
    setInsightTipSaved(docId, tipId, next)
      .then((result) => {
        setSaved(result.saved);
        writeLocal(storageKey, result.saved ? 'true' : null);
      })
      .catch(() => {
        setSaved(next);
        writeLocal(storageKey, next ? 'true' : null);
      });
  };

  return (
    <div className="zo-tip my-400 rounded-200 border border-[#fde68a] bg-[#fffbeb] p-200">
      <div className="flex items-start justify-between gap-150">
        <p className="font-designer-13b text-[#92400e]">꿀팁 #{tipId}</p>
        <ToggleButton
          pressed={saved}
          onPressedChange={handleSave}
          size="sm"
          variant="round"
          className={cn(
            'font-designer-12b min-h-550 shrink-0 bg-transparent px-150 active:scale-95',
            saved
              ? 'bg-fill-neutral-strong-default text-text-inverse'
              : 'border border-border-default text-text-subtle',
          )}
        >
          {saved ? '저장됨' : '저장'}
        </ToggleButton>
      </div>
      <div className="font-designer-14r mt-100 text-text-default">
        {children}
      </div>
    </div>
  );
}

// ── ArticlePoll (§3.2) ───────────────────────────────────────────────────
export function ArticlePoll({
  docId,
  pollId,
  question,
  kicker,
  options,
}: {
  docId: string;
  pollId: string;
  question: string;
  kicker?: string;
  options: string[];
}) {
  const storageKey = `zo:poll:${docId}:${pollId}`;
  const [answer, setAnswer] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<InsightPollSnapshot | null>(null);
  const optionSignature = options.join('\u0000');

  useEffect(() => {
    const currentOptions = options;
    const stored = readLocal(storageKey);
    const localAnswer = findPollOptionIndex(stored, currentOptions);
    setAnswer(localAnswer);

    let cancelled = false;
    getInsightPoll(docId, pollId)
      .then(async (result) => {
        if (cancelled) return;
        if (!result) {
          setSnapshot(null);
          return;
        }
        const mineIndex = findPollOptionIndex(result.mine, currentOptions);
        if (mineIndex === null && localAnswer !== null) {
          const migrated = await voteInsightPoll(
            docId,
            pollId,
            pollOptionKey(currentOptions[localAnswer] ?? '', localAnswer),
          );
          if (cancelled) return;
          setSnapshot(migrated);
          const migratedIndex = findPollOptionIndex(
            migrated.mine,
            currentOptions,
          );
          setAnswer(migratedIndex ?? localAnswer);
          writeLocal(
            storageKey,
            pollOptionKey(
              currentOptions[migratedIndex ?? localAnswer] ?? '',
              migratedIndex ?? localAnswer,
            ),
          );
          return;
        }
        setSnapshot(result);
        if (mineIndex !== null) {
          setAnswer(mineIndex);
          writeLocal(
            storageKey,
            pollOptionKey(currentOptions[mineIndex] ?? '', mineIndex),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      });

    return () => {
      cancelled = true;
    };
  }, [docId, optionSignature, pollId, storageKey]);

  const headingId = `zo-poll-${docId}-${pollId}`;
  const hasServerSnapshot = snapshot !== null;

  const chooseOption = (index: number) => {
    setAnswer(index);
    writeLocal(storageKey, pollOptionKey(options[index] ?? '', index));
    voteInsightPoll(docId, pollId, pollOptionKey(options[index] ?? '', index))
      .then((result) => {
        setSnapshot(result);
        const mineIndex = findPollOptionIndex(result.mine, options);
        if (mineIndex !== null) setAnswer(mineIndex);
      })
      .catch(() => undefined);
  };

  return (
    <div className="zo-poll my-400 rounded-200 border border-border-subtle bg-background-alternative p-200">
      {kicker ? (
        <p className="font-designer-12b mb-50 text-text-brand">{kicker}</p>
      ) : null}
      <p id={headingId} className="font-designer-15b text-text-strong">
        {question}
      </p>
      <div
        role="group"
        aria-labelledby={headingId}
        className="mt-150 flex flex-col gap-100"
      >
        {options.map((option, index) => {
          const isMine = answer === index;
          const count = pollOptionCount(snapshot, option, index);
          return (
            <ToggleButton
              key={option}
              pressed={isMine}
              onPressedChange={() => chooseOption(index)}
              size="md"
              variant="square"
              className={cn(
                'font-designer-14r flex min-h-550 w-full items-center justify-between bg-background-default text-left active:scale-[0.99]',
                isMine
                  ? 'border-border-brand text-text-brand'
                  : 'border-border-subtle text-text-subtle',
              )}
            >
              <span className="flex min-w-0 items-center gap-100">
                <span>{option}</span>
                {count !== null ? (
                  <span className="font-designer-12r text-text-subtlest">
                    {count.toLocaleString('ko-KR')}
                  </span>
                ) : null}
              </span>
              {isMine ? (
                <span className="font-designer-12b inline-flex items-center gap-25 text-text-brand">
                  <Check className="size-150" aria-hidden /> 내 답
                </span>
              ) : null}
            </ToggleButton>
          );
        })}
      </div>
      {answer !== null ? (
        <p className="font-designer-12r mt-150 text-text-subtlest">
          {insightPollFooterMessage(hasServerSnapshot)}
          {snapshot
            ? ` ${snapshot.total.toLocaleString('ko-KR')}명이 답했어요.`
            : null}{' '}
          <ToggleButton
            pressed={false}
            onPressedChange={() => {
              setAnswer(null);
              writeLocal(storageKey, null);
            }}
            className="border-0 bg-transparent p-0 text-text-brand underline-offset-2 hover:underline"
          >
            답 바꾸기
          </ToggleButton>
        </p>
      ) : null}
    </div>
  );
}

// ── useSectionReactions (핫픽스 2026-09-17 ask 4, 서버 연동 2026-09-21) ──
// 회장 지시: "디시인사이드처럼 다른 사람들이 이 절 보고 무슨 의견 냈는지
// 보여야" — 반응 칩(공감했어요/이미 알아요/처음 알았어요) + 한 줄 의견.
// 서버 응답이 오면 실수치·최근 의견을 보이고, 실패 시에만 localStorage 폴백.
export type SectionReactionKind = InsightSectionReactionKind;

export const SECTION_REACTION_LABELS: Record<SectionReactionKind, string> = {
  agree: '공감했어요',
  known: '이미 알아요',
  new: '처음 알았어요',
};

export interface SectionReactionsState {
  myReaction: SectionReactionKind | null;
  myComment: string;
  counts: Record<SectionReactionKind, number> | null;
  recentComments: InsightSectionComment[] | null;
  commentCount: number | null;
  setReaction: (kind: SectionReactionKind) => void;
  postComment: (text: string) => Promise<boolean>;
}

function applySectionSnapshot(
  snapshot: InsightSectionReactionSnapshot,
  setMyReaction: (value: SectionReactionKind | null) => void,
  setCounts: (value: Record<SectionReactionKind, number>) => void,
  setRecentComments: (value: InsightSectionComment[]) => void,
  setCommentCount: (value: number) => void,
  reactionKey: string,
) {
  const mine = asInsightSectionReaction(snapshot.mine);
  setMyReaction(mine);
  setCounts(snapshot.counts);
  setRecentComments(snapshot.comments ?? []);
  setCommentCount(snapshot.commentCount);
  writeLocal(reactionKey, mine);
}

export function useSectionReactions(
  documentId: string,
  sectionId: string,
  isMember = false,
): SectionReactionsState {
  const reactionKey = `zo:sec-reaction:${documentId}:${sectionId}`;
  const commentKey = `zo:sec-comment:${documentId}:${sectionId}`;
  const wireSectionId = sectionReactionToken(sectionId);
  const [myReaction, setMyReaction] = useState<SectionReactionKind | null>(
    null,
  );
  const [myComment, setMyComment] = useState('');
  const [counts, setCounts] = useState<Record<
    SectionReactionKind,
    number
  > | null>(null);
  const [recentComments, setRecentComments] = useState<
    InsightSectionComment[] | null
  >(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);

  useEffect(() => {
    const storedReaction = asInsightSectionReaction(readLocal(reactionKey));
    setMyReaction(storedReaction);
    setMyComment(readLocal(commentKey) ?? '');

    let cancelled = false;
    getInsightSectionReactions(documentId, wireSectionId)
      .then(async (result) => {
        if (cancelled) return;
        if (!result) {
          setCounts(null);
          setRecentComments(null);
          setCommentCount(null);
          return;
        }
        const mine = asInsightSectionReaction(result.mine);
        if (mine === null && storedReaction) {
          const migrated = await setInsightSectionReaction(
            documentId,
            wireSectionId,
            storedReaction,
          );
          if (cancelled) return;
          applySectionSnapshot(
            migrated,
            setMyReaction,
            setCounts,
            setRecentComments,
            setCommentCount,
            reactionKey,
          );
          return;
        }
        applySectionSnapshot(
          result,
          setMyReaction,
          setCounts,
          setRecentComments,
          setCommentCount,
          reactionKey,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setCounts(null);
        setRecentComments(null);
        setCommentCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [commentKey, documentId, reactionKey, wireSectionId]);

  const setReaction = (kind: SectionReactionKind) => {
    setMyReaction(kind);
    writeLocal(reactionKey, kind);
    setInsightSectionReaction(documentId, wireSectionId, kind)
      .then((result) => {
        applySectionSnapshot(
          result,
          setMyReaction,
          setCounts,
          setRecentComments,
          setCommentCount,
          reactionKey,
        );
      })
      .catch(() => undefined);
  };

  const postComment = async (text: string) => {
    const gate = canSubmitInsightSectionComment(isMember, text);
    if (gate !== 'ok') return false;
    const clipped = clampInsightSectionComment(text);
    setMyComment(clipped);
    writeLocal(commentKey, clipped);
    try {
      const result = await addInsightSectionComment(
        documentId,
        wireSectionId,
        clipped,
      );
      applySectionSnapshot(
        result,
        setMyReaction,
        setCounts,
        setRecentComments,
        setCommentCount,
        reactionKey,
      );
      return true;
    } catch {
      return false;
    }
  };

  return {
    myReaction,
    myComment,
    counts,
    recentComments,
    commentCount,
    setReaction,
    postComment,
  };
}

// ── SectionFeedback (h2 마다 자동, 반응 칩 + 한 줄 의견 재설계) ────────────
export function SectionFeedback({
  docId,
  sectionId,
  memberId,
}: {
  docId: string;
  sectionId: string;
  memberId?: number;
}) {
  const {
    myReaction,
    myComment,
    counts,
    recentComments,
    setReaction,
    postComment,
  } = useSectionReactions(docId, sectionId, memberId !== undefined);
  const showToast = useToastStore((state) => state.showToast);
  const [draft, setDraft] = useState(myComment);

  useEffect(() => {
    setDraft(myComment);
  }, [myComment]);

  const commentInputId = `zo-sec-comment-${docId}-${sectionId}`;

  const handleCommentFocus = () => {
    if (!memberId) {
      showToast(INSIGHT_SECTION_COMMENT_LOGIN_PROMPT, 'error');
    }
  };

  const handleCommentSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const gate = canSubmitInsightSectionComment(memberId !== undefined, draft);
    if (gate === 'guest') {
      showToast(INSIGHT_SECTION_COMMENT_LOGIN_PROMPT, 'error');
      return;
    }
    if (gate === 'empty') return;
    postComment(draft)
      .then((ok) => {
        if (!ok) {
          showToast(
            '의견을 지금은 올리지 못했어요. 잠시 후 다시 남겨주세요.',
            'error',
          );
        }
      })
      .catch(() => undefined);
  };

  return (
    <div className="zo-section-feedback my-400 rounded-200 border border-border-subtle bg-background-alternative p-200">
      <p className="font-designer-13m mb-100 text-text-subtle">
        이 절, 어떠셨어요?
      </p>
      <div
        role="group"
        aria-label="이 절 반응"
        className="flex flex-wrap gap-75"
      >
        {(Object.keys(SECTION_REACTION_LABELS) as SectionReactionKind[]).map(
          (kind) => {
            const pressed = myReaction === kind;
            return (
              <ToggleButton
                key={kind}
                pressed={pressed}
                onPressedChange={() => setReaction(kind)}
                size="sm"
                variant="round"
                className={cn(
                  'font-designer-13b inline-flex min-h-550 items-center gap-50 bg-transparent px-200 active:scale-95',
                  pressed
                    ? 'border-border-brand bg-background-accent-rose-subtle text-text-brand'
                    : 'border-border-subtle text-text-subtle',
                )}
              >
                {SECTION_REACTION_LABELS[kind]}
                <span className="font-designer-12r text-text-subtlest">
                  {formatReactionCountLabel(counts ? counts[kind] : null)}
                </span>
              </ToggleButton>
            );
          },
        )}
      </div>

      <form onSubmit={handleCommentSubmit} className="mt-150">
        <label
          htmlFor={commentInputId}
          className="font-designer-12b mb-50 block text-text-subtlest"
        >
          한 줄 남기기
        </label>
        <div className="flex items-center gap-75">
          <input
            id={commentInputId}
            type="text"
            value={draft}
            onFocus={handleCommentFocus}
            onChange={(event) =>
              setDraft(
                event.target.value.slice(0, INSIGHT_SECTION_COMMENT_MAX_LENGTH),
              )
            }
            maxLength={INSIGHT_SECTION_COMMENT_MAX_LENGTH}
            placeholder="이 절에 대한 한 줄 의견을 남겨보세요"
            className="min-h-550 w-full rounded-150 border border-border-subtle bg-background-default px-150 font-designer-14r text-text-default placeholder:text-text-subtlest"
          />
          <ToggleButton
            pressed={false}
            type="submit"
            size="sm"
            variant="round"
            className="font-designer-13b min-h-550 shrink-0 border-border-subtle bg-transparent px-200 text-text-subtle active:scale-95"
          >
            남기기
          </ToggleButton>
        </div>
        <p className="font-designer-12r mt-50 text-text-subtlest">
          {draft.length}/{INSIGHT_SECTION_COMMENT_MAX_LENGTH}
        </p>
      </form>

      <div className="mt-150 border-t border-border-subtle pt-150">
        <p className="font-designer-12b mb-50 text-text-subtlest">최근 의견</p>
        {recentComments === null ? (
          <p className="font-designer-12r text-text-subtlest">집계 전</p>
        ) : recentComments.length === 0 ? (
          <p className="font-designer-12r text-text-subtlest">
            아직 한 줄 의견이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-75">
            {recentComments.map((comment) => (
              <li
                key={String(comment.id)}
                className="font-designer-12r text-text-subtle"
              >
                <span className="font-designer-12b mr-75 text-text-default">
                  {comment.nickname?.trim() ? comment.nickname : '회원'}
                </span>
                {comment.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── IslandGreeting (§0-1, zo-island) ──────────────────────────────────────
export function IslandGreeting({ children }: { children: React.ReactNode }) {
  return (
    <aside className="zo-island my-500 rounded-200 border border-border-subtle bg-background-alternative p-250 font-designer-14r leading-relaxed text-text-subtle italic">
      {children}
    </aside>
  );
}

// ── BrowserChrome (핫픽스 2026-09-17 ask 3) ───────────────────────────────
// 발급 화면 재현물(<figure aria-label><div class="zo-screen">…</div>)을
// 브라우저 창처럼 감싼다. 시안 .chrome 스타일 참조(신호등 3점 + 탭 제목 +
// 주소창). 타사 UI 재현물이라 DESIGN.md §2 하드룰 예외로 리터럴 색을 쓴다
// (ArticleChat 의 Claude 목업과 같은 예외).
//
// 우선순위(코디네이터 지시): 원고에 data-url 이 있으면 그것을 쓴다. 없으면
// figcaption 텍스트에서 서비스명을 heuristic 으로 찾는다. 그것도 없으면
// 크롬 없이 지금처럼 렌더한다(원고 밖 화면을 임의로 서비스라고 단정하지
// 않는다 — 잘못 추정한 주소를 보여주는 게 안 보여주는 것보다 나쁘다).
const CHROME_SERVICE_PATTERNS: Array<{
  match: RegExp;
  tab: string;
  url: string;
}> = [
  {
    match: /supabase/i,
    tab: 'API Keys | Supabase',
    url: 'supabase.com/dashboard/project/xxxxxxxx/settings/api-keys',
  },
  {
    match: /stripe/i,
    tab: 'API keys | Stripe',
    url: 'dashboard.stripe.com/apikeys',
  },
  {
    match: /(vercel|배포\s*서비스|environment\s*variables?|환경\s*변수)/i,
    tab: 'Environment Variables | Vercel',
    url: 'vercel.com/your-team/your-project/settings/environment-variables',
  },
];

export function detectChromeFrame(
  captionText: string,
  dataUrl?: string,
  dataTab?: string,
): { tab: string; url: string } | undefined {
  if (dataUrl) {
    return { tab: dataTab ?? dataUrl, url: dataUrl };
  }
  const hit = CHROME_SERVICE_PATTERNS.find((p) => p.match.test(captionText));
  return hit ? { tab: hit.tab, url: hit.url } : undefined;
}

// ── ZoScreenReveal (핫픽스 2026-09-17 ask 5-a) ────────────────────────────
// 발급 화면 재현물이 뷰포트에 들어오면 마스킹된 값(.val)이 왼쪽부터
// 타이핑되듯 드러나고(0.6초), 빨간 경고줄(.warn)이 0.3초 뒤 슬라이드인
// 한다. 이 두 클래스는 시안(insight-article-v2-opus5.html)의 zo-screen
// 재현물 마크업 컨벤션이다 — 원고에 없으면(클래스가 안 맞으면) 그냥
// 아무 애니메이션도 안 걸리고 평소처럼 보인다(안전한 폴백).
export function ZoScreenReveal({ children }: { children: React.ReactNode }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  return (
    <div ref={ref} className={cn('zo-screen-reveal', inView && 'is-inview')}>
      {children}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .zo-screen-reveal .val { opacity: 0; }
          .zo-screen-reveal.is-inview .val {
            animation: zo-screen-val-reveal 0.6s steps(12, end) forwards;
          }
          .zo-screen-reveal .warn {
            opacity: 0;
            transform: translateX(-8px);
          }
          .zo-screen-reveal.is-inview .warn {
            animation: zo-screen-warn-slide 0.3s ease-out 0.3s forwards;
          }
          @keyframes zo-screen-val-reveal {
            to { opacity: 1; }
          }
          @keyframes zo-screen-warn-slide {
            to { opacity: 1; transform: translateX(0); }
          }
        }
      `}</style>
    </div>
  );
}

export function BrowserChrome({
  tab,
  url,
  children,
}: {
  tab: string;
  url: string;
  children: React.ReactNode;
}) {
  return (
    <div className="browser-chrome overflow-hidden rounded-150 border border-[#dde1e5] bg-white shadow-[0_1px_0_rgba(0,0,0,.03)]">
      <div className="flex items-center gap-100 border-b border-[#dde1e5] bg-[#f1f3f5] px-125 py-100 font-designer-12r text-[#5f6368]">
        <span className="inline-flex shrink-0 items-center gap-50" aria-hidden>
          <i className="size-100 rounded-full bg-[#fe5f57]" />
          <i className="size-100 rounded-full bg-[#febc2e]" />
          <i className="size-100 rounded-full bg-[#28c840]" />
        </span>
        <span className="max-w-3000 truncate rounded-t-75 border border-b-0 border-[#dde1e5] bg-white px-125 py-25 text-[#1f1f1f]">
          {tab}
        </span>
      </div>
      <div className="flex items-center gap-100 border-b border-[#dde1e5] bg-white px-125 py-75">
        <span className="truncate rounded-full bg-[#f1f3f5] px-150 py-50 font-designer-12r font-mono text-[#3c4043]">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}
