'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

interface HeaderNavProps {
  isLoggedIn: boolean;
}

interface NavItem {
  href: string;
  label: string;
  comingSoon: boolean;
  badge?: string;
  external?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/class', label: '클래스', comingSoon: false },
  // 정적 페이지 /seminar/1/index.html 미배포로 404. 파일 배포되면 external 링크로 복구.
  { href: '/seminar', label: '세미나', comingSoon: true },
  { href: '/community', label: '커뮤니티', comingSoon: false },
  { href: '/insights', label: '인사이트', comingSoon: false },
];

function ComingSoonNavItem({
  label,
  isActive,
}: {
  label: string;
  isActive: boolean;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const updatePosition = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({
      top: rect.bottom,
      left: rect.left + rect.width / 2,
    });
  };

  return (
    <div
      ref={anchorRef}
      className="relative shrink-0 whitespace-nowrap p-100"
      onMouseEnter={updatePosition}
      onMouseLeave={() => setTooltipPos(null)}
    >
      <span
        className={cn(
          'cursor-default',
          isActive ? 'text-text-brand' : 'text-text-subtle',
        )}
      >
        {label}
      </span>
      {/* 헤더의 mix-blend-multiply compositing group을 탈출하기 위해 portal로 body에 렌더링 */}
      {tooltipPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-50 -translate-x-1/2 pt-50"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            <div className="relative flex items-center justify-center rounded-100 bg-background-brand-default px-125 py-75">
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: -21,
                  width: 41,
                  height: 41,
                }}
              >
                <div
                  className="absolute"
                  style={{
                    bottom: '25%',
                    left: '10.26%',
                    right: '10.26%',
                    top: '4.88%',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    aria-hidden="true"
                    className="block size-full max-w-none"
                    src="/icons/comming-soon-arrow.svg"
                  />
                </div>
              </div>
              <p className="font-designer-13m whitespace-nowrap text-gray-0">
                Coming Soon
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function HeaderNav({ isLoggedIn: _isLoggedIn }: HeaderNavProps) {
  const pathname = usePathname();

  return (
    <nav className="font-designer-14m flex min-w-0 grow items-center gap-50 px-0 whitespace-nowrap lg:gap-75 lg:px-75 xl:shrink-0 xl:grow-0 xl:gap-100 xl:px-100">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);

        if (item.comingSoon) {
          return (
            <ComingSoonNavItem
              key={item.label}
              label={item.label}
              isActive={isActive}
            />
          );
        }

        return (
          <div key={item.label} className="relative shrink-0 whitespace-nowrap">
            {item.external ? (
              <a
                href={item.href}
                className={cn(
                  'p-100 max-lg:inline-flex max-lg:min-h-550 max-lg:items-center',
                  isActive ? 'text-text-brand' : 'text-text-subtle',
                )}
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'p-100 max-lg:inline-flex max-lg:min-h-550 max-lg:items-center',
                  isActive ? 'text-text-brand' : 'text-text-subtle',
                )}
              >
                {item.label}
              </Link>
            )}
            {item.badge && (
              <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 animate-[pulse_1.6s_ease-in-out_infinite] pt-50">
                <div className="relative flex items-center justify-center rounded-100 bg-background-brand-default px-125 py-75">
                  <svg
                    viewBox="0 0 32.5848 28.75"
                    aria-hidden="true"
                    className="absolute bottom-full left-1/2 w-150 -translate-x-1/2 translate-y-px fill-background-brand-default"
                  >
                    <path d="M14.5604 0.999998C15.3302 -0.333336 17.2547 -0.333331 18.0245 1L32.3139 25.75C33.0837 27.0833 32.1214 28.75 30.5818 28.75H2.00298C0.463379 28.75 -0.498866 27.0833 0.270934 25.75L14.5604 0.999998Z" />
                  </svg>
                  <p className="font-designer-13m whitespace-nowrap text-gray-0">
                    {item.badge}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
