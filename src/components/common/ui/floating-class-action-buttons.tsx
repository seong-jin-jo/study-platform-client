'use client';

import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Button from '@/components/common/ui/button';

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_VmCYn';
const FOOTER_GAP = 24;
// SSR defaults mirror the `.mobile-tabbar-safe-bottom-fab` (390) /
// `sm:bottom-2500` className tokens. 73 = 탭바 실제 렌더 높이(--tabbar-height
// = --spacing-700(56) + border-t 1px = 57) + 버튼 간격(--spacing-200=16),
// 즉 CSS 클래스가 페인트하는 값과 정확히 같은 공식이다(탭바 높이를 56으로만
// 잡으면 실측 57px과 1px 어긋나 독립 리뷰 2026-09-26 재반려에서 390 카카오
// bottom 788 vs 탭바 top 787처럼 항상 1px 겹쳤다 — --tabbar-height 도입으로
// 여기도 함께 맞춘다). hydration 전(SSR/첫 페인트)은 이 CSS 클래스가 그리고,
// mount 직후 이 JS 값으로 다시 계산해 스크롤 중 footer/문의 알약과의
// 충돌까지 함께 처리한다 — 두 값을 다르게 두면(예: SSR 73 vs JS 80)
// hydration 직후 버튼이 튀는 것만 새로 생긴다. safe-area는 이 상수와
// 별개로 아래 calc()에서 매번 더한다(리뷰 반려 2026-09-26 MINOR 1 — 이전
// 코멘트의 "80px가 안전영역에서 10px 겹쳤다"는 설명이 부정확했다: 실제
// 겹침은 SSR 클래스 없이 JS 상수만 80이던 구간에서 계산 순서 문제로
// 발생했고, 겹침의 원인은 픽셀 값 자체가 아니라 두 소스의 불일치였다).
const DEFAULT_BOTTOM = 73;
const DEFAULT_BOTTOM_SM = 200;
const SM_BREAKPOINT = 640;

type UtilityLayoutMode =
  | 'community-responsive'
  | 'fixed'
  | 'sprint8-flow'
  | 'sprint8-responsive';

export const resolveServiceUtilityLayout = (
  pathname: string,
  fromInsight?: string | null,
): UtilityLayoutMode => {
  if (pathname === '/insights') return 'sprint8-flow';
  if (
    pathname.startsWith('/insights/land/') ||
    pathname.startsWith('/insights/koans')
  ) {
    return 'sprint8-flow';
  }
  if (pathname.startsWith('/insights/')) return 'sprint8-responsive';
  if (pathname.startsWith('/community/rooms/') && fromInsight?.trim()) {
    return 'sprint8-responsive';
  }
  if (pathname.startsWith('/community')) return 'community-responsive';
  return 'fixed';
};

export const shouldShowMobileScrollToTop = (
  scrollTop: number,
  viewportHeight: number,
) => scrollTop >= viewportHeight;

export default function FloatingClassActionButtons({
  layoutMode = 'fixed',
  scrollContainerSelector,
}: {
  layoutMode?: UtilityLayoutMode;
  scrollContainerSelector?: string;
} = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showMobileScrollToTop, setShowMobileScrollToTop] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scrollContainer = scrollContainerSelector
      ? document.querySelector<HTMLElement>(scrollContainerSelector)
      : null;
    const scrollTarget = scrollContainer ?? window;

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const scrollTop = scrollContainer?.scrollTop ?? window.scrollY;
      const scrollViewportHeight = scrollContainer?.clientHeight || vh;
      setShowMobileScrollToTop(
        shouldShowMobileScrollToTop(scrollTop, scrollViewportHeight),
      );
      if (layoutMode !== 'fixed') {
        el.style.removeProperty('bottom');
        return;
      }

      let bottom =
        window.innerWidth >= SM_BREAKPOINT ? DEFAULT_BOTTOM_SM : DEFAULT_BOTTOM;
      // Re-query every tick: both neighbors are optional per layout (footer on
      // landing, inquiry pill on study-detail) and the inquiry pill can mount a
      // frame after this effect runs. The FAB sits above whichever floating
      // neighbor is currently lower in the viewport.
      const footer = document.querySelector('footer');
      if (footer) {
        const footerTop = footer.getBoundingClientRect().top;
        if (footerTop < vh) {
          bottom = Math.max(bottom, vh - footerTop + FOOTER_GAP);
        }
      }
      const inquiry = document.querySelector<HTMLElement>(
        '[data-floating-inquiry]',
      );
      if (inquiry) {
        const inquiryTop = inquiry.getBoundingClientRect().top;
        bottom = Math.max(bottom, vh - inquiryTop + FOOTER_GAP);
      }
      // var(--sat-b)는 global.css :root 의 env(safe-area-inset-bottom, 0px) 별칭.
      // e2e가 document.documentElement에 이 변수를 덮어써 iPhone safe-area를
      // 흉내 낼 수 있도록 var() 경유로 쓴다(리뷰 반려 2026-09-26 검증 요구).
      el.style.bottom = `calc(${bottom}px + var(--sat-b))`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    // Second pass next frame to catch the inquiry pill if it mounts late.
    const initialFrame = window.requestAnimationFrame(update);
    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(initialFrame);
    };
  }, [layoutMode, scrollContainerSelector]);

  const scrollToTop = () => {
    const target = scrollContainerSelector
      ? document.querySelector<HTMLElement>(scrollContainerSelector)
      : null;
    (target ?? window).scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      data-testid="service-utility-actions"
      data-layout-mode={layoutMode}
      className={cn(
        'z-50 flex items-center',
        layoutMode === 'fixed'
          ? 'fixed right-200 mobile-tabbar-safe-bottom-fab flex-col gap-400 sm:right-600 sm:bottom-2500'
          : 'relative w-full flex-row justify-end gap-200 px-250 py-250 sm:px-400 service-utility-row-clearance',
        layoutMode === 'sprint8-responsive' &&
          's8:fixed s8:right-200 s8:bottom-2500 s8:w-auto s8:flex-col s8:px-0 s8:py-0',
        layoutMode === 'community-responsive' &&
          's8:fixed s8:right-600 s8:bottom-2500 s8:w-auto s8:flex-col s8:px-0 s8:py-0',
      )}
    >
      <a
        href={KAKAO_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="카카오톡 상담"
        className={cn(
          'flex size-700 items-center justify-center overflow-hidden rounded-full shadow-lg',
          layoutMode === 'fixed' && 'sm:flex md:size-875',
          (layoutMode === 'sprint8-responsive' ||
            layoutMode === 'community-responsive') &&
            's8:size-875',
          layoutMode === 'fixed' && showMobileScrollToTop && 'hidden sm:flex',
        )}
      >
        <Image
          src="/icons/kakao-channel.png"
          alt="카카오톡 채널"
          width={70}
          height={70}
          unoptimized
          className="size-full object-cover"
        />
      </a>

      <Button
        type="button"
        color="outlined"
        size="large"
        onClick={scrollToTop}
        aria-label="맨 위로 이동"
        className={cn(
          'size-700 flex-col rounded-full border-gray-300 bg-background-default p-0 shadow-1 hover:bg-background-default active:bg-background-default [&>span]:contents',
          layoutMode === 'fixed' ? 'hidden sm:flex md:size-875' : 'flex',
          (layoutMode === 'sprint8-responsive' ||
            layoutMode === 'community-responsive') &&
            's8:size-875',
          layoutMode === 'fixed' && showMobileScrollToTop && 'flex',
        )}
      >
        <svg
          viewBox="0 0 23.4433 14.9"
          className="-rotate-90 -scale-x-100 size-300 text-gray-500"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M22.11 6.11H4.55L8.39 2.27C8.91 1.75 8.91 0.91 8.39 0.39C7.87 -0.13 7.03 -0.13 6.51 0.39L0.39 6.51C-0.13 7.03 -0.13 7.87 0.39 8.39L6.51 14.51C7.03 15.03 7.87 15.03 8.39 14.51C8.91 13.99 8.91 13.15 8.39 12.63L4.55 8.77667H22.11C22.8433 8.77667 23.4433 8.17667 23.4433 7.44333C23.4433 6.71 22.8433 6.11 22.11 6.11Z" />
        </svg>
        <span className="font-designer-16r text-gray-500">TOP</span>
      </Button>
    </div>
  );
}

export function ServiceFloatingClassActionButtons() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pathname === '/insights') return null;
  const layoutMode = resolveServiceUtilityLayout(
    pathname,
    searchParams.get('from'),
  );

  return <FloatingClassActionButtons layoutMode={layoutMode} />;
}
