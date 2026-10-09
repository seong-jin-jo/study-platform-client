'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/components/common/ui/(shadcn)/lib/utils';

const NAV_ITEMS = [
  { href: '/my-page', label: '프로필' },
  { href: '/my-class', label: '마이 클래스', showComingSoon: true },
  { href: '/my-posts', label: '내가 작성한 글', prefixMatch: true },
  { href: '/saved-posts', label: '저장한 글' },
  { href: '/notification', label: '알림' },
  { href: '/my-inquiry', label: '1:1 문의', prefixMatch: true },
  {
    href: '/builder-ticket',
    label: '빌더 티켓',
    prefixMatch: true,
    showComingSoon: true,
  },
  {
    href: '/class-payment-management',
    label: '결제 관리',
    showComingSoon: true,
  },
];

export default function MyPageMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex overflow-x-auto border-b border-border-subtle lg:hidden [&::-webkit-scrollbar]:hidden">
      {NAV_ITEMS.map((item) => {
        const isExternal = item.href.startsWith('http');

        return (
          <Link
            key={item.href}
            href={item.href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className={cn(
              'font-designer-14m shrink-0 px-300 py-200 text-text-subtle',
              (item.prefixMatch
                ? pathname.startsWith(item.href)
                : pathname === item.href) &&
                'border-b-2 border-border-brand text-text-brand',
            )}
          >
            {item.label}
            {'showComingSoon' in item && item.showComingSoon && (
              <span className="ml-75 rounded-full bg-background-neutral-subtle px-100 py-25 font-designer-10b text-text-subtlest">
                준비 중
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
