'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import {
  APPINTOSS_ALLOWED_MARKDOWN_ELEMENTS,
  isAllowedAppintossHref,
  transformAppintossMarkdownUrl,
} from '@/components/appintoss/appintoss-content-policy';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';
import { replaceEmoticonShortcodes } from '@/components/common/ui/editor/emoticon-shortcode';
import {
  ArticleChat,
  ArticleHeroSlots,
  ArticlePoll,
  ArticleProgressCelebration,
  ArticleTip,
  ArticleToc,
  ArticleTopActions,
  BrowserChrome,
  detectChromeFrame,
  IslandGreeting,
  ReadMeter,
  SectionFeedback,
  SocialProofLine,
  type TocItem,
  useArticleReadProgress,
  ZoScreenReveal,
} from '@/components/insights/article-v2-components';
import InsightArticleActions, {
  resolvePublicSocialProofSnapshot,
} from '@/components/insights/insight-article-actions';
import { useAuthReady } from '@/features/auth/model/use-auth';
import { useInsightMapQuery } from '@/hooks/queries/insights/use-insight-worldmap-query';
import type {
  ArticleTeaser,
  RenderableArticle,
} from '@/types/insights/article';

interface BlogDetailPageProps {
  accessMeta: ArticleTeaser;
  article: RenderableArticle;
  authDegraded: boolean;
  memberId?: number;
  readOnly?: boolean;
}

// 이모티콘 인라인 크기. emoticon-shortcode.ts 의 EMOTICON_SIZE_CLASS 규격과
// 동일한 px 값을 쓴다(정본은 그 파일). 클래스 자체를 재사용하지 않는 이유는
// 이 렌더러가 raw <img class="emoticon-inline"> 를 img 컴포넌트 오버라이드로
// 가로채 Next/Image 740px 전폭 처리와 분기해야 하기 때문이다.
const EMOTICON_SIZE_PX: Record<string, number> = {
  'emoticon-inline': 24,
  'emoticon-lg': 48,
  'emoticon-xl': 96,
  'emoticon-xxl': 150,
};

// 이미지 슬라이더 컴포넌트
function ImageSlider({ files }: { files: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? files.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === files.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="mb-225 flex justify-center">
      <div className="w-2/3">
        {/* 이미지 컨테이너 */}
        <div className="relative overflow-hidden rounded-125 bg-background-accent-gray-subtle">
          <div>
            {files.map((file: any, idx: number) => {
              const imageUrl = file.url;

              return (
                <div
                  key={file.id || idx}
                  className={idx === currentIndex ? 'block' : 'hidden'}
                >
                  <Image
                    unoptimized
                    src={imageUrl}
                    alt={file.name || file.alternativeText || 'Slider Image'}
                    width={800}
                    height={500}
                    className="h-auto w-full object-contain"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 인디케이터 (점) */}
        {files.length > 1 && (
          <div className="mt-100 flex justify-center gap-50">
            {files.map((_, index) => (
              <Button
                key={index}
                type="button"
                color="secondary"
                size="xsmall"
                onClick={() => goToSlide(index)}
                className={cn(
                  'h-75 w-75 rounded-full p-0 transition-[width,background-color]',
                  index === currentIndex
                    ? 'w-200 bg-background-brand-default active:bg-background-brand-default'
                    : 'bg-fill-neutral-default-default hover:bg-fill-neutral-default-hover active:bg-fill-neutral-default-default',
                )}
                aria-label={`${index + 1}번째 이미지로 이동`}
              />
            ))}
          </div>
        )}

        {/* 이미지 카운터 + 좌우 버튼 */}
        <div className="mt-50 flex items-center justify-center gap-100">
          {/* 이전 버튼 */}
          <Button
            type="button"
            color="secondary"
            size="medium"
            onClick={goToPrevious}
            className="mr-125 h-500 w-500 rounded-full bg-transparent p-0 text-2xl text-text-subtle transition-colors hover:bg-fill-neutral-default-default active:bg-fill-neutral-default-hover"
            aria-label="이전 이미지"
          >
            &lt;
          </Button>

          {/* 카운터 */}
          <div className="flex items-center text-lg font-bold text-text-subtle">
            {currentIndex + 1} / {files.length}
          </div>

          {/* 다음 버튼 */}
          <Button
            type="button"
            color="secondary"
            size="medium"
            onClick={goToNext}
            className="ml-125 h-500 w-500 rounded-full bg-transparent p-0 text-2xl text-text-subtle transition-colors hover:bg-fill-neutral-default-default active:bg-fill-neutral-default-hover"
            aria-label="다음 이미지"
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}

// 미디어(이미지/비디오) 블록 공통 래퍼
function MediaFigure({
  caption,
  children,
}: {
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-800 w-full">
      {children}
      {caption && (
        <figcaption className="mt-200 text-center font-designer-13r text-text-subtlest">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// 본문 글자 수로 읽는 시간을 계산한다. 한국어 성인 묵독 속도는 분당 약 500자로
// 알려져 있어 그 값을 쓰고, 아무리 짧아도 1분으로 내린다. 이 값을 상수로 박으면
// 모든 글이 같은 시간으로 보인다(2026-08-25, 시안의 "7분"이 코드에 그대로
// 박혀 있던 것을 고친 자리).
const KOREAN_CHARS_PER_MINUTE = 500;

function collectBlockText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(collectBlockText).join(' ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => key === 'text' || key === 'body' || key === 'children')
      .map(([, child]) => collectBlockText(child))
      .join(' ');
  }
  return '';
}

// 읽는 시간 계산 전에 HTML 태그·마크다운 기호를 걷어낸다. 이걸 안 하면
// "<div style="...">" 같은 마크업 글자 수까지 본문으로 세어져, 8천 자짜리
// 글이 54분으로 뜨는 결함이 났다(2026-09-16 라이브 실측, api-key 글).
function stripMarkupForReadingTime(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ') // 펜스드 코드블록
    .replace(/`[^`]*`/g, ' ') // 인라인 코드
    .replace(/<[^>]*>/g, ' ') // HTML 태그(속성값 포함 전부 제거)
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ') // 이미지
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1') // 링크는 표시 텍스트만 남김
    .replace(/&[a-zA-Z#0-9]+;/g, ' ') // HTML 엔티티
    .replace(/[#>*_~|`-]/g, ' '); // 잔여 마크다운 기호
}

export function readingMinutes(blocks: any): number {
  const raw = collectBlockText(blocks);
  const text = stripMarkupForReadingTime(raw).replace(/\s+/g, '');
  return Math.max(1, Math.round(text.length / KOREAN_CHARS_PER_MINUTE));
}

// --- 목차 앵커: h2 id 부여 + TOC 자동 링크 -------------------------------

function extractPlainText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractPlainText).join('');
  }
  if (React.isValidElement(node)) {
    return extractPlainText(
      (node.props as { children?: React.ReactNode })?.children,
    );
  }
  return '';
}

// TOC 상자에 손으로 적힌 "1. 결론" 같은 번호 접두사를 벗겨 h2 원문과 비교할 수
// 있게 정규화한다.
function normalizeHeadingText(text: string): string {
  return text
    .replace(/^\d+[.)]\s*/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// CMS 원고는 zo-hero 뒤의 인트로 미디어와 첫 절을 시각적으로 나누려고
// `&nbsp;` 문단과 `---`를 함께 넣는다. zo-hero를 카드 컴포넌트로 승격한 뒤에도
// 이 장식 줄을 그대로 렌더하면 빈 문단 2개와 hr의 여백이 누적된다. api-key
// 로컬 실측(1280px, 2026-09-18)은 영상 하단→hr 199.5px, →첫 h2 248.5px였다.
// 데이터 계약은 그대로 두고, 승격된 hero와 첫 h2 사이의 독립 `&nbsp;`와
// 그 장식 공백 바로 뒤의 마지막 `---`만 제거한다. 영상·zo-toc·실제 문장과
// 장식 공백에서 떨어진 구분선, 첫 h2 이후의 구분선은 보존한다.
function compactPromotedHeroLead(body: string): string {
  const heroStart = body.search(
    /<section\b[^>]*class=(?:"zo-hero"|'zo-hero')[^>]*>/i,
  );
  if (heroStart < 0) return body;

  const heroEndTag = '</section>';
  const heroEnd = body.indexOf(heroEndTag, heroStart);
  if (heroEnd < 0) return body;

  const leadStart = heroEnd + heroEndTag.length;
  const headingOffset = body.slice(leadStart).search(/^##(?!#)\s+.+$/m);
  if (headingOffset < 0) return body;

  const headingStart = leadStart + headingOffset;
  const leadLines = body.slice(leadStart, headingStart).split('\n');
  const lastContentIndex = leadLines.findLastIndex(
    (line) => line.trim().length > 0,
  );
  const previousContentIndex = leadLines.findLastIndex(
    (line, index) => index < lastContentIndex && line.trim().length > 0,
  );
  const hasDecorativeSeparator =
    /^\s*---\s*$/.test(leadLines[lastContentIndex] ?? '') &&
    /^\s*(?:&nbsp;|\u00a0)\s*$/i.test(leadLines[previousContentIndex] ?? '');
  const compactedLines = leadLines.filter(
    (line) => !/^\s*(?:&nbsp;|\u00a0)\s*$/i.test(line),
  );

  if (hasDecorativeSeparator) {
    const separatorIndex = compactedLines.findLastIndex(
      (line) => line.trim().length > 0,
    );
    if (/^\s*---\s*$/.test(compactedLines[separatorIndex] ?? '')) {
      compactedLines.splice(separatorIndex, 1);
    }
  }

  const compactedLead = compactedLines.join('\n').replace(/\n{3,}/g, '\n\n');

  return `${body.slice(0, leadStart)}${compactedLead}${body.slice(headingStart)}`;
}

function slugifyHeading(text: string, counts: Map<string, number>): string {
  const base =
    text
      .replace(/^\d+[.)]\s*/, '')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '') || 'section';
  const occurrence = (counts.get(base) ?? 0) + 1;
  counts.set(base, occurrence);
  return occurrence === 1 ? base : `${base}-${occurrence}`;
}

interface HeadingIndex {
  // h2 렌더링 순서와 같은 순서로 소비되는 id 큐. 마크다운 소스 순서 == 렌더 순서
  // 라는 전제로 둘 다 하나의 스캔에서 만든다.
  orderedIds: string[];
  // orderedIds 와 같은 순서의 원문 텍스트. ArticleToc(zo-toc)가 소비한다.
  orderedTexts: string[];
  // 본문 안 목차 상자(li 텍스트)가 h2 제목과 일치하는지 찾기 위한 맵.
  textToId: Map<string, string>;
}

// article.blocks 의 rich-text 마크다운 원문을 스캔해 h2 id를 미리 확정한다.
// h2 렌더 컴포넌트가 실제 DOM에 앉기 *전에* TOC(li) 렌더가 먼저 지나가는
// 문서 구조(목차 상자가 본문 맨 위)를 고려해, 렌더 시점 카운터가 아니라
// 사전 스캔으로 id를 고정한다.
function buildHeadingIndex(blocks: unknown): HeadingIndex {
  const counts = new Map<string, number>();
  const orderedIds: string[] = [];
  const orderedTexts: string[] = [];
  const textToId = new Map<string, string>();
  const list = Array.isArray(blocks) ? blocks : [];

  for (const block of list) {
    const body = (block as { __component?: string; body?: unknown })?.body;
    const component = (block as { __component?: string })?.__component;
    if (!component?.includes('rich-text') || typeof body !== 'string') {
      continue;
    }

    const lines = body.split('\n');
    for (const line of lines) {
      const mdMatch = line.match(/^##(?!#)\s+(.+)$/);
      const htmlMatch = line.match(/<h2[^>]*>(.*?)<\/h2>/i);
      const rawText = mdMatch?.[1] ?? htmlMatch?.[1];
      if (!rawText) continue;

      const text = rawText
        .replace(/<[^>]+>/g, '')
        .replace(/[*_`]/g, '')
        .trim();
      if (!text) continue;

      const id = slugifyHeading(text, counts);
      orderedIds.push(id);
      orderedTexts.push(text);
      const key = normalizeHeadingText(text);
      if (!textToId.has(key)) {
        textToId.set(key, id);
      }
    }
  }

  return { orderedIds, orderedTexts, textToId };
}

// 절반 응원 토스트(핫픽스 2026-09-17 ask 2)에 zo-toc 의 data-note 를
// 재사용한다 — 없으면 컴포넌트가 고정 문구로 대체한다(지시에 "재사용하거나
// 고정 문구" 둘 다 허용). buildHeadingIndex 와 같은 방식으로 원문
// 마크다운을 사전 스캔한다(렌더 트리를 따로 안 타는 이유는 이 값이
// 필요한 시점이 h2/토글 렌더보다 먼저, BlogDetailPage 최상단이기 때문).
function extractZoTocNote(blocks: unknown): string | undefined {
  const list = Array.isArray(blocks) ? blocks : [];
  for (const block of list) {
    const body = (block as { __component?: string; body?: unknown })?.body;
    const component = (block as { __component?: string })?.__component;
    if (!component?.includes('rich-text') || typeof body !== 'string') {
      continue;
    }
    const match = body.match(/class="zo-toc"[^>]*data-note="([^"]*)"/);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

// 상단 고정 읽기 진행 막대. CSS scroll-driven animation(`animation-timeline:
// scroll()`)을 우선 쓰고, 미지원 브라우저에서는 스크롤 리스너 폴백으로 너비를
// 갱신한다. aria-valuenow는 접근성 때문에 두 경로 모두 JS로 계속 갱신한다.
// pct 는 .zo-article-body 시작~끝 기준(문서 전체 아님, §3.4). 진행 막대와
// 레일 ReadMeter 가 같은 값을 공유하도록 훅으로 뺐다(정의는
// article-v2-components.tsx — 성능 핫픽스 참고, 아래).
//
// ── 성능 핫픽스(2026-09-16) ─────────────────────────────────────────────
// 이 훅을 예전엔 BlogDetailPage 본문 안에서 직접 호출했다. 그러면 스크롤마다
// setState 가 BlogDetailPage 자신의 fiber 에서 일어나 BlogDetailPage 전체가
// 재렌더되고, 그 안에서 새로 만들어지는 MarkdownComponents 참조 때문에
// react-markdown 이 본문 트리를 통째로 언마운트/재마운트했다(운영 실측:
// 스크롤 20틱 동안 DOM 변이 8,550건, 지시문 복사 버튼 노드 교체 →
// Playwright timeout). 지금은 ReadingProgressBar·ReadMeter 각자가 이 훅을
// 자기 안에서 호출한다 — setState 가 그 리프 컴포넌트에만 갇혀서 부모
// BlogDetailPage 는 스크롤로 재렌더되지 않는다.
function ReadingProgressBar({ minutes }: { minutes: number }) {
  const progress = useArticleReadProgress();
  const roundedPct = Math.round(progress);
  const leftMinutes = Math.ceil((minutes * (100 - roundedPct)) / 100);
  const valueText =
    roundedPct >= 100
      ? '다 읽었어요'
      : leftMinutes <= 1
        ? `${roundedPct}% 읽음 · 1분 안 남았어요`
        : `${roundedPct}% 읽음 · 약 ${leftMinutes}분 남음`;

  return (
    <div
      role="progressbar"
      aria-valuenow={roundedPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
      aria-label="글 읽기 진행률"
      className="fixed top-0 left-0 z-30 h-25 w-full overflow-hidden bg-transparent"
    >
      <div
        className="zo-reading-progress-bar h-full origin-left bg-background-brand-default transition-[width] duration-80 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function BlogDetailPage({
  accessMeta,
  article,
  authDegraded,
  memberId,
  readOnly = false,
}: BlogDetailPageProps) {
  const { memberId: hydratedMemberId } = useAuthReady();
  const effectiveMemberId = hydratedMemberId ?? memberId;

  // 목차 클릭 스크롤을 부드럽게. 이 페이지에서만 켜고 떠날 때 되돌린다.
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  const headingIndex = useMemo(
    () => buildHeadingIndex(article.blocks),
    [article.blocks],
  );
  const readingMinutesValue = readingMinutes(article.blocks);
  const halfwayNote = useMemo(
    () => extractZoTocNote(article.blocks),
    [article.blocks],
  );
  // 진행률·스크롤스파이 상태는 더 이상 여기서 호출하지 않는다 — 각 리프
  // 컴포넌트(ReadingProgressBar/ReadMeter/ArticleToc)가 자기 안에서
  // 관리한다(성능 핫픽스, 2026-09-16 위 주석 참고).
  const tocItems: TocItem[] = useMemo(
    () =>
      headingIndex.orderedIds.map((id, index) => ({
        id,
        text: headingIndex.orderedTexts[index] ?? '',
      })),
    [headingIndex],
  );

  // §3.1 사회적 증명. insight-map 쿼리 실측치만 쓴다(가짜 숫자 금지).
  const insightMap = useInsightMapQuery();
  const mapArticle = useMemo(
    () =>
      insightMap.data?.islands
        .flatMap((island) => island.articles)
        .find((item) => item.documentId === article.documentId),
    [article.documentId, insightMap.data],
  );
  const socialProof = resolvePublicSocialProofSnapshot({
    article: mapArticle,
    documentId: article.documentId,
  });

  // h2 렌더러가 순서대로 소비하는 커서. ref 인 이유: MarkdownComponents 를
  // useMemo 로 안정된 참조로 고정했기 때문에(핫픽스, 아래 참고) 매 렌더마다
  // 새로 생성되는 지역 변수로는 카운터를 못 둔다 — 렌더마다 리셋해야 하는
  // 상태를, 렌더 바깥에서 안정적으로 살아있는 ref 에 둔다. 값 자체는
  // 마크다운 소스 순서에서만 결정되므로 재렌더돼도 같은 id가 나온다.
  const headingCursorRef = useRef(0);
  headingCursorRef.current = 0;

  // ── 성능 핫픽스(2026-09-16) ────────────────────────────────────────────
  // 이 객체가 BlogDetailPage 렌더마다(스크롤·설문 클릭 등으로 재렌더될 때마다)
  // 새로 만들어지면 react-markdown 이 components 프로퍼티 전체가 "새 타입"이라고
  // 보고 본문 트리를 통째로 언마운트/재마운트한다(운영 실측: 스크롤 20틱에 DOM
  // 변이 8,550건, 지시문 복사 버튼 노드 교체 → Playwright "element not stable",
  // 실사용자는 스크롤 중 탭 씹힘 + CPU 과열). 진행률·스크롤스파이 상태는 이제
  // 이 컴포넌트 자신이 아니라 각자 리프 컴포넌트(ReadingProgressBar/ReadMeter/
  // ArticleToc) 안에 격리했으므로, 이 useMemo 는 article/memberId 가 바뀔 때만
  // 재계산된다 — 스크롤 중에는 재생성되지 않는다.
  const MarkdownComponents = useMemo(
    () => ({
      section: (props: any) => {
        const { className, children, ...rest } = props;
        const kids = React.Children.toArray(children);
        const findByProp = (key: string, value?: string) =>
          kids.find(
            (child) =>
              React.isValidElement(child) &&
              (value === undefined
                ? (child.props as any)[key] !== undefined
                : (child.props as any)[key] === value),
          ) as React.ReactElement | undefined;

        if (className === 'zo-hero') {
          const before = findByProp('data-slot', 'before');
          const after = findByProp('data-slot', 'after');
          return (
            <ArticleHeroSlots
              before={(before?.props as any)?.children}
              after={(after?.props as any)?.children}
            />
          );
        }

        if (className === 'zo-toc') {
          return (
            <ArticleToc
              variant="card"
              items={tocItems}
              note={rest['data-note']}
            />
          );
        }

        if (className === 'zo-poll') {
          if (readOnly) {
            return <section className={className}>{children}</section>;
          }
          const options = kids
            .filter(
              (child) =>
                React.isValidElement(child) &&
                (child.props as any)['data-option'] !== undefined,
            )
            .map((child) =>
              extractPlainText(
                ((child as React.ReactElement).props as any)?.children,
              ),
            );
          return (
            <ArticlePoll
              docId={article.documentId}
              pollId={rest['data-id'] ?? 'poll'}
              question={rest['data-question'] ?? ''}
              kicker={rest['data-kicker']}
              options={options}
            />
          );
        }

        if (className === 'zo-chat') {
          if (readOnly) {
            return <section className={className}>{children}</section>;
          }
          const userNode = findByProp('data-role', 'user');
          const assistantNode = findByProp('data-role', 'assistant');
          return (
            <ArticleChat
              title={rest['data-title']}
              user={extractPlainText((userNode?.props as any)?.children)}
              assistant={(assistantNode?.props as any)?.children}
            />
          );
        }

        if (className === 'zo-tip') {
          if (readOnly) {
            return <section className={className}>{children}</section>;
          }
          return (
            <ArticleTip
              docId={article.documentId}
              tipId={rest['data-id'] ?? '1'}
              isMember={effectiveMemberId !== undefined}
            >
              {children}
            </ArticleTip>
          );
        }

        if (className === 'zo-island') {
          return <IslandGreeting>{children}</IslandGreeting>;
        }

        // 계약 밖 className(예: zo-quiz, 화두글 원고)은 그대로 통과시킨다.
        return (
          <section className={className} {...rest}>
            {children}
          </section>
        );
      },

      // hr 은 순수 구분선이다. 절 피드백은 h2 경계에서만 낸다(위 h2 참고) —
      // 절 "안"에 원고가 hr 을 여러 개 두면(실측: 픽스처 원고가 그렇다) 예전엔
      // 그 hr 마다 피드백이 잘못 끼어들었다.
      hr: () => (
        <hr className="my-600 border-0 border-t border-border-subtle" />
      ),

      // 발급 화면 재현물(<figure aria-label><div class="zo-screen">…
      // </div><figcaption>)을 브라우저 창처럼 감싼다(핫픽스 2026-09-17
      // ask 3). data-url/data-tab 이 원고(figure 또는 zo-screen div)에
      // 있으면 그걸 우선 쓰고, 없으면 figcaption 텍스트로 서비스를
      // 추정한다(§ detectChromeFrame). 둘 다 없으면 크롬 없이 그대로
      // 통과시킨다 — 잘못 추정한 주소를 보여주는 게 안 보여주는 것보다 나쁘다.
      figure: (props: any) => {
        const { className, children, ...rest } = props;
        const kids = React.Children.toArray(children);
        const screenChild = kids.find(
          (child) =>
            React.isValidElement(child) &&
            (child.props as any).className === 'zo-screen',
        ) as React.ReactElement | undefined;
        const captionChild = kids.find(
          (child) => React.isValidElement(child) && child.type === 'figcaption',
        ) as React.ReactElement | undefined;

        if (!screenChild) {
          return (
            <figure className={className} {...rest}>
              {children}
            </figure>
          );
        }

        const screenProps = (screenChild.props ?? {}) as Record<string, any>;
        const dataUrl = rest['data-url'] ?? screenProps['data-url'];
        const dataTab = rest['data-tab'] ?? screenProps['data-tab'];
        const captionText = captionChild
          ? extractPlainText((captionChild.props as any)?.children)
          : '';
        const frame = detectChromeFrame(captionText, dataUrl, dataTab);

        return (
          <figure className={className} {...rest}>
            <ZoScreenReveal>
              {frame ? (
                <BrowserChrome tab={frame.tab} url={frame.url}>
                  {screenChild}
                </BrowserChrome>
              ) : (
                screenChild
              )}
            </ZoScreenReveal>
            {captionChild}
          </figure>
        );
      },

      video: (props: any) => {
        const { src, children } = props;
        if (!src) return null;
        const videoUrl = src;

        return (
          <video
            controls
            playsInline
            className="mx-auto my-800 block w-full rounded-50 sm:w-4/5"
          >
            <source src={videoUrl} type="video/mp4" />
            {children}
          </video>
        );
      },

      img: (image: any) => {
        const { src, alt, className } = image;
        if (!src) return null;

        // 이모티콘 shortcode 변환 결과(`/emoticon/*.png`)는 740px 전폭 figure
        // 처리를 타면 안 된다. 원문 문장 흐름 속에 인라인 크기로 남아야 한다.
        if (typeof src === 'string' && src.startsWith('/emoticon/')) {
          const sizeKey =
            typeof className === 'string' && EMOTICON_SIZE_PX[className]
              ? className
              : 'emoticon-inline';
          const px = EMOTICON_SIZE_PX[sizeKey];
          const img = (
            <Image
              unoptimized
              src={src}
              alt={alt || ''}
              width={px}
              height={px}
              loading="lazy"
              className="my-0 inline-block h-auto max-h-full w-auto shrink-0 align-middle"
              style={{ height: px, width: 'auto' }}
            />
          );

          // §2: `:what_xl:`/`:what_xxl:`는 원고 관례상 언제나 단독 문단으로만
          // 쓴다(인라인은 접미사 없는 기본 24px). remark 가 raw HTML 이미지
          // 하나짜리 줄을 <p> 로 안 감싸고 블록 그대로 넘기는 경우가 있어
          // (실측 2026-09-17: `:welcome_xxl:` 단독 줄이 <p> 없이 렌더됨),
          // p 오버라이드의 "단독 문단 감지"에 의존하지 않고 여기서 직접
          // 가운데 정렬 블록으로 감싼다 — xxl(150px)은 위아래 24px, xl(96px)
          // 은 기존처럼 하단만.
          if (sizeKey === 'emoticon-xxl') {
            return <span className="my-300 block text-center">{img}</span>;
          }
          if (sizeKey === 'emoticon-xl') {
            return <span className="mb-350 block text-center">{img}</span>;
          }
          return img;
        }

        return (
          <Image
            unoptimized
            src={src}
            alt={alt || ''}
            width={740}
            height={500}
            className="mx-auto my-800 block w-full rounded-50 object-contain"
          />
        );
      },

      p: ({ children }: any) => {
        const containsBlockMedia = React.Children.toArray(children).some(
          (child) => {
            if (!React.isValidElement(child)) return false;
            if (child.type === MediaFigure) return true;
            const props = (child.props ?? {}) as { src?: unknown };
            const src = typeof props.src === 'string' ? props.src : undefined;
            if (!src) return false;
            // 이모티콘 이미지는 문단 안에 계속 흘러야 하므로 블록 미디어가 아니다.
            return !src.startsWith('/emoticon/');
          },
        );
        if (containsBlockMedia) {
          return <div className="mb-350">{children}</div>;
        }

        // §2: `:what_xl:`/`:what_xxl:` 단독 문단은 가운데 정렬한다
        // (p:has(> img.emoticon-xl/xxl:only-child) 규칙). xxl(150px)은
        // 회장 지시(2026-09-17 "이모티콘 너무 작음")로 원고가 xl→xxl 로
        // 재발행되므로 위아래 24px(my-300) 여백을 추가로 준다.
        const childArray = React.Children.toArray(children);
        const nonWhitespace = childArray.filter(
          (child) => typeof child !== 'string' || child.trim() !== '',
        );
        const soloEmoticonWidth =
          nonWhitespace.length === 1 && React.isValidElement(nonWhitespace[0])
            ? (nonWhitespace[0].props as { width?: number }).width
            : undefined;
        if (soloEmoticonWidth === EMOTICON_SIZE_PX['emoticon-xxl']) {
          return <p className="my-300 text-center">{children}</p>;
        }
        if (soloEmoticonWidth === EMOTICON_SIZE_PX['emoticon-xl']) {
          return <p className="mb-350 text-center">{children}</p>;
        }

        return (
          <p className="mb-350 text-[16px] leading-[1.75] text-text-default [&_strong]:font-bold [&_strong]:text-text-strong sm:text-[17px]">
            {children}
          </p>
        );
      },

      h1: ({ children }: any) => (
        <h1 className="mt-700 mb-250 text-[24px] font-bold leading-tight text-text-strong sm:text-[30px]">
          {children}
        </h1>
      ),
      h2: ({ children }: any) => {
        const index = headingCursorRef.current;
        const id = headingIndex.orderedIds[index];
        headingCursorRef.current += 1;

        // 절 피드백은 h2 경계 기준: 이번 h2 "바로 앞"에 직전 절(index-1)의
        // SectionFeedback 을 낸다. 절 안의 hr 은 무시한다(hr 기준이면 절 중간
        // 구분선마다 잘못 끼어드는 사고였다). 첫 h2 앞에는 내지 않는다.
        const previousSectionId =
          index > 0 ? headingIndex.orderedIds[index - 1] : undefined;

        return (
          <>
            {previousSectionId && !readOnly ? (
              <SectionFeedback
                docId={article.documentId}
                sectionId={previousSectionId}
                memberId={effectiveMemberId}
              />
            ) : null}
            <h2
              id={id}
              className={cn(
                // 첫 h2 는 히어로 바로 다음이라 절 사이 리듬(임의 60px 상단 여백)이 아니라
                // 시안처럼 촘촘한 간격을 쓴다(핫픽스 2026-09-17 ask 1 — 예전엔
                // 히어로~1절 사이가 약 230px 이었다).
                index === 0 ? 'mt-400' : 'mt-[60px]',
                'zo-h2-numbered mb-300 text-[22px] font-bold leading-tight text-text-strong sm:text-[28px]',
              )}
              style={{ scrollMarginTop: 96 }}
            >
              {children}
            </h2>
          </>
        );
      },
      h3: ({ children }: any) => (
        <h3 className="mt-500 mb-200 text-[19px] font-bold leading-tight text-text-strong sm:text-[22px]">
          {children}
        </h3>
      ),
      h4: ({ children }: any) => (
        <h4 className="mt-400 mb-150 text-[17px] font-bold leading-tight text-text-strong sm:text-[18px]">
          {children}
        </h4>
      ),
      h5: ({ children }: any) => (
        <h5 className="mt-300 mb-125 text-[16px] font-bold leading-tight text-text-strong">
          {children}
        </h5>
      ),

      ul: ({ children }: any) => (
        <ul className="mb-400 list-disc space-y-150 pl-300 text-[16px] leading-[1.75] text-text-default sm:text-[17px]">
          {children}
        </ul>
      ),
      ol: ({ children }: any) => (
        <ol className="mb-400 list-decimal space-y-150 pl-300 text-[16px] leading-[1.75] text-text-default sm:text-[17px]">
          {children}
        </ol>
      ),
      li: ({ children }: any) => {
        // 본문 안 목차 상자의 항목 텍스트가 h2 제목과 일치하면 자동으로 앵커
        // 링크가 되게 한다. 이미 저자가 직접 <a href="#..."> 를 넣은 경우는
        // rehype-raw 가 그 링크 자체를 자식으로 넘겨주므로 여기서 건드리지 않는다.
        const alreadyLinked = React.Children.toArray(children).some(
          (child) => React.isValidElement(child) && child.type === 'a',
        );
        const text = extractPlainText(children).trim();
        const headingId =
          !alreadyLinked && text
            ? headingIndex.textToId.get(normalizeHeadingText(text))
            : undefined;

        if (headingId) {
          return (
            <li>
              <a
                href={`#${headingId}`}
                className="text-text-brand underline-offset-2 hover:underline"
              >
                {children}
              </a>
            </li>
          );
        }
        return <li>{children}</li>;
      },

      blockquote: ({ children }: any) => (
        <blockquote className="my-400 border-l-4 border-border-brand pl-200 text-[16px] leading-[1.75] text-text-subtle italic sm:text-[17px]">
          {children}
        </blockquote>
      ),

      div: ({ children, className, style, ...rest }: any) =>
        className === 'note' ? (
          <aside className="my-350 rounded-r-100 border-l-4 border-border-default bg-background-alternative px-175 py-150 font-designer-14r leading-relaxed text-text-subtle">
            {children}
          </aside>
        ) : (
          // style 을 버리지 않는다. 이걸 버려서 본문의 꾸민 상자가 전부 맨
          // 텍스트로 보이던 결함이었다(2026-08-17 커밋 0b2d8e53 이후,
          // 2026-09-16 라이브 실측으로 확인).
          <div className={className} style={style} {...rest}>
            {children}
          </div>
        ),

      // GFM 표. remark-gfm 이 없으면 "| 층 | 사는 곳 |" 원문 파이프가 그대로
      // 찍히던 결함이었다(2026-09-16 라이브 실측).
      table: ({ children }: any) => (
        <div className="my-400 w-full overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-100 border border-border-subtle text-[15px]">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: any) => (
        <thead className="bg-background-alternative">{children}</thead>
      ),
      tbody: ({ children }: any) => <tbody>{children}</tbody>,
      tr: ({ children }: any) => (
        <tr className="border-b border-border-subtle last:border-b-0">
          {children}
        </tr>
      ),
      th: ({ children }: any) => (
        <th className="border border-border-subtle px-150 py-100 text-left font-designer-13b text-text-default">
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className="border border-border-subtle px-150 py-100 text-[14px] leading-[1.6] text-text-default">
          {children}
        </td>
      ),

      a: ({ href, children }: any) => {
        if (!href) {
          return readOnly ? <span>{children}</span> : <a>{children}</a>;
        }

        // 본문 안 앵커(#으로 시작)는 같은 페이지 스크롤 이동이다. 새 탭으로
        // 열면 안 되고 target=_blank 를 강제하면 안 된다.
        if (href.startsWith('#')) {
          return (
            <a
              href={href}
              className="text-text-brand underline-offset-2 hover:underline"
            >
              {children}
            </a>
          );
        }

        if (readOnly && !isAllowedAppintossHref(href)) {
          return <span>{children}</span>;
        }

        const isVideoFile = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(href);
        if (isVideoFile) {
          const videoUrl = href;

          return (
            <video
              controls
              playsInline
              className="mx-auto my-800 block w-full rounded-50 sm:w-4/5"
            >
              <source src={videoUrl} type="video/mp4" />
              브라우저가 비디오 태그를 지원하지 않습니다.
            </video>
          );
        }

        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-brand underline-offset-2 hover:underline"
          >
            {children}
          </a>
        );
      },

      strong: ({ children }: any) => (
        <strong className="font-bold text-text-strong">{children}</strong>
      ),

      // block code: pre가 배경/패딩/overflow 전담하므로 스타일 없이 반환
      // inline code: 배경·색상·패딩만 담당
      code: ({ children, className }: any) => {
        const isBlock = className?.includes('language-');
        if (isBlock) {
          return (
            <code className="font-mono font-designer-13r leading-[1.7] text-text-inverse">
              {children}
            </code>
          );
        }

        return (
          <code className="rounded-25 bg-background-accent-gray-subtle px-75 py-25 font-mono font-designer-13r text-text-error">
            {children}
          </code>
        );
      },

      // pre가 블록 코드의 배경·패딩·overflow·radius를 단독 담당
      pre: ({ children }: any) => (
        <pre className="my-400 overflow-x-auto rounded-100 bg-fill-neutral-strong-default p-250 font-designer-13r leading-[1.7] text-text-inverse">
          {children}
        </pre>
      ),
    }),
    [headingIndex, tocItems, article.documentId, effectiveMemberId, readOnly],
  );

  const renderBlock = (block: any, index: number) => {
    // 1. Rich Text
    if (block.__component?.includes('rich-text')) {
      if (Array.isArray(block.body)) {
        return (
          <div key={index} className="space-y-200">
            {block.body.map((item: any, i: number) => {
              if (item.type === 'paragraph') {
                return (
                  <p
                    key={i}
                    className="mb-200 text-[16px] leading-[1.75] text-text-default"
                  >
                    {item.children?.map((child: any, j: number) => (
                      <span key={j}>{child.text}</span>
                    ))}
                  </p>
                );
              }

              return null;
            })}
          </div>
        );
      }

      return (
        <div key={index} className="text-[16px] text-text-default">
          {block.body ? (
            <ReactMarkdown
              components={MarkdownComponents}
              allowedElements={
                readOnly ? [...APPINTOSS_ALLOWED_MARKDOWN_ELEMENTS] : undefined
              }
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              urlTransform={
                readOnly ? transformAppintossMarkdownUrl : undefined
              }
            >
              {replaceEmoticonShortcodes(compactPromotedHeroLead(block.body))}
            </ReactMarkdown>
          ) : null}
        </div>
      );
    }

    // 2. 인용구
    if (block.__component?.includes('quote')) {
      return (
        <blockquote
          key={index}
          className="my-400 rounded-r-50 border-l-4 border-border-brand bg-background-accent-rose-subtle py-200 pl-200 pr-250"
        >
          {block.title && (
            <p className="mb-100 text-[16px] font-bold leading-[1.75] text-text-default">
              {block.title}
            </p>
          )}
          <p className="text-[16px] leading-[1.75] text-text-subtle italic">
            {block.body}
          </p>
        </blockquote>
      );
    }

    // 3. 미디어
    if (block.__component?.includes('media')) {
      const resolveMedia = (raw: any) => {
        const fileData = raw?.data || raw;
        if (!fileData) return null;
        const url = fileData.url;
        if (!url) return null;

        return {
          url,
          mime: fileData.mime,
          name: fileData.name,
          alt: fileData.alternativeText || '',
        };
      };

      const media = resolveMedia(block.file) ?? resolveMedia(block.data);
      if (!media) return null;

      const isVideo =
        media.mime?.startsWith('video/') ||
        /\.(mp4|webm|ogg|mov)$/i.test(media.url);

      if (isVideo) {
        return (
          <MediaFigure key={index}>
            <video
              controls
              playsInline
              className="mx-auto w-full rounded-50 sm:w-4/5"
            >
              <source src={media.url} type={media.mime || 'video/mp4'} />
              브라우저가 비디오 태그를 지원하지 않습니다.
            </video>
          </MediaFigure>
        );
      }

      return (
        <MediaFigure key={index}>
          <Image
            unoptimized
            src={media.url}
            alt={media.alt}
            width={740}
            height={500}
            className="mx-auto w-full rounded-50 object-contain"
          />
        </MediaFigure>
      );
    }

    // 4. 슬라이더
    if (block.__component?.includes('slider')) {
      let files = null;
      if (block.files?.data) files = block.files.data;
      else if (block.files && Array.isArray(block.files)) files = block.files;
      else if (block.data && Array.isArray(block.data)) files = block.data;

      if (!files || files.length === 0) {
        return (
          <p key={index} className="my-400 text-center text-text-subtlest">
            표시할 이미지가 없습니다.
          </p>
        );
      }

      return <ImageSlider key={index} files={files} />;
    }

    return null;
  };

  return (
    <div className="w-full">
      <ReadingProgressBar minutes={readingMinutesValue} />
      {!readOnly ? (
        <ArticleProgressCelebration
          documentId={article.documentId}
          halfwayNote={halfwayNote}
        />
      ) : null}
      <div className="sticky top-[3px] z-20 bg-fill-neutral-strong-default text-text-inverse">
        <div className="mx-auto flex min-h-600 max-w-9250 items-center justify-between px-300 sm:px-500 lg:px-0">
          <Link
            href={`/insights/land/${accessMeta.islandSlug}`}
            className="font-designer-13b text-text-inverse"
          >
            ← {accessMeta.islandName ?? article.category?.name ?? '개척지'}
          </Link>
          <span className="font-designer-12b text-text-inverse opacity-70">
            {accessMeta.ordinal}번째 물길
          </span>
        </div>
        <progress
          aria-label={`${accessMeta.ordinal}번째 물길`}
          className="block h-25 w-full appearance-none overflow-hidden bg-fill-neutral-default-default [&::-moz-progress-bar]:bg-fill-warning-default [&::-webkit-progress-bar]:bg-fill-neutral-default-default [&::-webkit-progress-value]:bg-fill-warning-default"
          max={8}
          value={Math.min(8, accessMeta.ordinal)}
        />
      </div>
      {authDegraded && (
        <div className="font-designer-13m mx-auto mt-150 max-w-9250 rounded-150 border border-border-warning bg-background-accent-yellow-subtle p-150 text-text-warning">
          세션이 만료됐어요. 다시 로그인하면 이어서 읽을 수 있어요.
        </div>
      )}
      {/* 본문 전체 래퍼. 3단 반응형(spec §1·§5, 핫픽스 2026-09-17):
          - <1024: 1단(그리드 꺼짐), 컨테이너 740 유지.
          - 1024~1279(lg): 레일 300 고정 + 본문 나머지(최소 680 보장).
          - ≥1280(xl): 컨테이너를 740(본문)+48(간격)+340(레일)=1128 로 넓혀
            본문 740·레일 340 그대로 앉힌다.
          예전엔 이 래퍼가 항상 max-w-9250(740)이라 xl 에서도 그리드가 740
          안에 눌려 본문 열이 약 352px 로 반토막 났었다(운영 1440 캡처 실측).
          `minmax(680px, ...)` 를 본문 트랙 자체에 걸어 뷰포트가 좁아도(1024)
          본문이 680 밑으로 줄지 않게 그리드가 직접 보장한다.
          lg:items-start 로 레일이 그리드 행 높이만큼 늘어나지 않게 한다
          (sticky가 그 안에서 동작하려면 필요). */}
      <div className="mx-auto w-full max-w-9250 px-300 pt-400 pb-875 sm:px-500 lg:grid lg:max-w-none lg:grid-cols-[minmax(680px,1fr)_300px] lg:items-start lg:gap-400 lg:px-0 xl:max-w-14100 xl:grid-cols-[minmax(680px,740px)_340px] xl:gap-600">
        {/* @container: 히어로 두 칸(ArticleHeroSlots)이 뷰포트가 아니라
            "본문 열 자신의 렌더 폭"으로 1열/2열을 정한다(spec, 핫픽스
            2026-09-17 ask 3) — 그리드 브레이크포인트(lg)와 본문 열의 실제
            폭이 항상 같이 움직이지는 않기 때문(예: 1024 미만 태블릿에서도
            본문 열이 이미 640px 이상 넓으면 2열이 자연스럽다). */}
        <article className="lg:min-w-0 @container">
          {/* 헤더 영역 */}
          <header className="mb-225 border-b border-border-subtle pb-200">
            <p className="font-designer-12b text-text-subtlest">
              {accessMeta.islandName ?? article.category?.name ?? '개척지'} ·
              개념글
            </p>

            {/* 제목 */}
            <h1 className="mt-100 text-[26px] font-bold leading-[1.35] text-text-strong sm:text-[34px]">
              {article.title}
            </h1>
            {/* meta 행: 편집팀·분 정보 + 저장·도움됐어요(시안 .meta .acts,
                핫픽스 2026-09-17 ask 2). 하단 InsightArticleActions 와
                같은 쿼리 캐시를 공유해서 상태가 같이 움직인다. */}
            <div className="mt-150 flex flex-wrap items-center justify-between gap-150">
              <p className="font-designer-12b text-text-subtlest">
                {/* 편집팀 계정 메일(insight-editor@zeroone.local)이 독자 화면에 그대로
                    노출되던 것을 뺀다. 시안에도 없는 정보이고 내부 주소다.
                    PR #462 에서 한 번 제거했는데 Sprint8 충돌 해소로 되살아났다. */}
                {`ZERO-ONE 편집팀 · 읽는 데 ${readingMinutesValue}분`}
              </p>
              {!readOnly ? (
                <ArticleTopActions
                  articleSlug={article.slug}
                  documentId={article.documentId}
                  memberId={effectiveMemberId}
                />
              ) : null}
            </div>
            <SocialProofLine
              viewCount={socialProof?.viewCount ?? 0}
              helpfulCount={socialProof?.helpfulCount ?? 0}
            />
          </header>

          {/* zo-toc 마커가 본문에 있으면 section 오버라이드가 그 자리에서
              ArticleToc(card)로 승격한다(§2). 마커 없는 원고(화두글 등)는
              1차에서 자동 삽입하지 않는다 — 손글 목차가 있는 구원고는 그대로. */}

          {/* 본문. zo-article-body 클래스가 counter-reset 을 갖고, 각 h2 는
              zo-h2-numbered 클래스로 counter-increment + "N. " 접두사를 받는다.
              (f) h2 자동 번호는 CSS counter 구현이라 TOC 에 저자가 손으로 적은
              번호와 항상 같은 순서로 맞는다. */}
          <section className="zo-article-body min-h-[200px]">
            <style>{`
              .zo-article-body { counter-reset: zo-h2; }
              .zo-article-body h2.zo-h2-numbered::before {
                counter-increment: zo-h2;
                content: counter(zo-h2) ". ";
                color: var(--color-text-brand);
              }
              /* 데스크톱(lg+)에서 인라인 목차(zo-toc-card)는 lg:hidden 으로
                 화면에서 지워지지만, 자기 마진과 원고에 이어 나오는 hr 은
                 그대로 남아 히어로~1절 사이에 빈 공백만 생겼다(운영 1440
                 캡처 실측, 2026-09-17). 숨을 때 마진도 0으로, 바로 다음
                 hr 도 같이 지운다. */
              @media (min-width: 1024px) {
                .zo-toc-card { margin: 0; }
                .zo-toc-card + hr { display: none; }
              }
            `}</style>
            {article.blocks?.map((block: any, index: number) =>
              renderBlock(block, index),
            )}
            {/* 마지막 절은 그 뒤에 h2(n+1)가 없어 위 h2 오버라이드가 못
                잡는다. 본문 끝에서 마지막 절 하나만 내보낸다(§2). h2 렌더
                순서가 실제 리액트 트리 커밋 시점에 결정되므로(이 JSX 배열은
                BlogDetailPage 자신의 렌더 시점에 동기 평가돼 아직 h2가 하나도
                안 불린 상태다), 런타임 커서가 아니라 사전 스캔한
                headingIndex 에서 정적으로 마지막 id를 구한다. */}
            {headingIndex.orderedIds.length > 0 && !readOnly ? (
              <SectionFeedback
                docId={article.documentId}
                sectionId={
                  headingIndex.orderedIds[headingIndex.orderedIds.length - 1]
                }
                memberId={effectiveMemberId}
              />
            ) : null}
          </section>

          {!readOnly ? (
            <InsightArticleActions
              articleSlug={article.slug}
              documentId={article.documentId}
              fallback={{
                islandId: accessMeta.islandId,
                islandName: accessMeta.islandName,
                islandSlug: accessMeta.islandSlug,
              }}
              memberId={effectiveMemberId}
            />
          ) : null}
        </article>

        {/* top-875(70px) = sticky 상단 바(island nav, ~53px) + 16px(회장 지시
            2026-09-17 "레일 전체가 sticky"). 예전 top-1600(128px)은 값
            자체는 sticky를 막지 않지만 헤더 바로 아래 불필요한 빈 틈을
            남겼다. lg:self-start 는 부모 그리드의 lg:items-start 와 같은
            효과를 이 요소에도 명시적으로 박아둔다 — "align-self: start가
            sticky를 막는 원인일 수 있다"는 지시를 문자 그대로 반영. */}
        <aside
          className="rail hidden lg:sticky lg:top-875 lg:block lg:self-start"
          data-testid="article-rail"
        >
          <div className="flex flex-col gap-200">
            <ReadMeter minutes={readingMinutesValue} />
            <ArticleToc variant="rail" items={tocItems} />
          </div>
        </aside>
      </div>
    </div>
  );
}
