'use client';

import { GraduationCap, Home, MessagesSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

// PublicMemberShell 공유 내비 계약(docs/design/app-release/ui-architecture.md §2).
// RN 앱과 목적지 ID·라벨·아이콘 의미·순서를 동일하게 유지한다.
interface TabItem {
  id: 'HOME' | 'INSIGHTS' | 'COMMUNITY' | 'CLASSES';
  href: string;
  label: string;
  icon: typeof Home;
}

const TAB_ITEMS: TabItem[] = [
  { id: 'HOME', href: '/', label: '홈', icon: Home },
  { id: 'INSIGHTS', href: '/insights', label: '인사이트', icon: Sparkles },
  {
    id: 'COMMUNITY',
    href: '/community',
    label: '커뮤니티',
    icon: MessagesSquare,
  },
  { id: 'CLASSES', href: '/class', label: '클래스', icon: GraduationCap },
];

function isTabActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname.startsWith(href);
}

// 구매·로그인·온보딩처럼 이탈 방지가 필요한 흐름 화면에서는 탭바를 숨긴다
// (설계: docs/design/app-release/ui-architecture.md §2 "행동 버튼과 섞지 않는다").
// 이 화면들의 로고는 각 페이지 헤더/브랜드 마크로 별도 제공되며 탭바가 유일한
// 로고 노출 수단이 아니므로 숨겨도 손실이 없다.
const FLOW_ROUTE_PREFIXES = ['/onboarding', '/sign-up', '/payment'];
// 클래스 결제 흐름은 /class/[slug]/payment(및 그 하위 /success, /pending)
// 형태라 위 접두어 목록의 startsWith 검사에 걸리지 않았다(리뷰 반려
// 2026-09-26 MINOR 6). 결제 중 탭 이동으로 흐름을 이탈시키지 않는다는
// 같은 원칙을 슬러그 경로에도 적용한다.
const CLASS_PAYMENT_FLOW_PATTERN = /^\/class\/[^/]+\/payment(\/|$)/;

function isFlowRoute(pathname: string) {
  return (
    FLOW_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    CLASS_PAYMENT_FLOW_PATTERN.test(pathname)
  );
}

interface MobileTabBarProps {
  className?: string;
}

export default function MobileTabBar({ className }: MobileTabBarProps) {
  const pathname = usePathname();

  if (isFlowRoute(pathname)) {
    return null;
  }

  return (
    <nav
      aria-label="주요 이동"
      data-testid="mobile-tab-bar"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex border-t border-border-subtle bg-background-default md:hidden',
        className,
      )}
      style={{
        // --sat-* 는 global.css :root 에서 env(safe-area-inset-*)로 정의된다.
        // e2e 가 document.documentElement 에 이 변수를 덮어써 안전영역을
        // 흉내 낼 수 있도록 var() 경유로 쓴다(리뷰 반려 2026-09-26 검증 요구).
        paddingBottom: 'var(--sat-b)',
        paddingLeft: 'var(--sat-l)',
        paddingRight: 'var(--sat-r)',
      }}
    >
      {TAB_ITEMS.map(({ id, href, label, icon: Icon }) => {
        const isActive = isTabActive(pathname, href);
        return (
          <Link
            key={id}
            href={href}
            data-testid={`mobile-tab-${id.toLowerCase()}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-h-700 flex-1 flex-col items-center justify-center gap-25 py-75 text-center transition-colors active:bg-fill-neutral-default-default',
              isActive ? 'text-text-brand' : 'text-text-subtle',
            )}
          >
            <Icon
              aria-hidden="true"
              size={22}
              strokeWidth={isActive ? 2.25 : 1.75}
            />
            <span className="font-designer-12m leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
