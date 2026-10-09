'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import LogoutConfirmModal from '@/components/common/modals/logout-confirm-modal';
import { cn } from '@/components/common/ui/(shadcn)/lib/utils';
import Avatar from '@/components/common/ui/avatar';
import IconButton from '@/components/common/ui/icon-button';
import TextActionButton from '@/components/common/ui/text-action-button';
import PwaInstallMenuItem from '@/components/pwa/pwa-install-menu-item';
import { useUserStore } from '@/stores/use-user-store';
import { getDefaultAvatarSrc } from '@/utils/avatar-utils';

const LoginModal = dynamic(
  () => import('@/components/auth/modals/login-modal'),
);

interface NavItem {
  href: string;
  label: string;
  comingSoon: boolean;
  badge?: string;
  external?: boolean;
}

// 클래스/커뮤니티/인사이트는 390 하단 탭바(mobile-tab-bar.tsx)로 이동했다.
// 이 드로어는 탭바에 없는 보조 목적지(세미나 Coming Soon)와 계정 메뉴만 남긴다.
// 정적 페이지 /seminar/1/index.html 미배포로 404. 파일 배포되면 external 링크로 복구.
const NAV_ITEMS: NavItem[] = [
  { href: '/seminar', label: '세미나', comingSoon: true },
];

interface MobileMenuDrawerProps {
  isLoggedIn: boolean;
  userImg?: string;
}

export default function MobileMenuDrawer({
  isLoggedIn,
  userImg,
}: MobileMenuDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const pathname = usePathname();
  const memberId = useUserStore((state) => state.memberId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {/* 햄버거 버튼 — header 내부에 유지 */}
      <IconButton
        onClick={() => setIsOpen(true)}
        label="메뉴 열기"
        size="md"
        className="flex flex-col gap-75 p-100 hover:bg-transparent"
      >
        <svg
          width="22"
          height="2"
          viewBox="0 0 22 2"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="22" height="2" fill="currentColor" />
        </svg>
        <svg
          width="22"
          height="2"
          viewBox="0 0 22 2"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="22" height="2" fill="currentColor" />
        </svg>
        <svg
          width="22"
          height="2"
          viewBox="0 0 22 2"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="22" height="2" fill="currentColor" />
        </svg>
      </IconButton>

      {/* 드로어 패널 — 헤더의 mix-blend-multiply compositing group을 탈출하기 위해 portal로 body에 렌더링 */}
      {mounted &&
        createPortal(
          <>
            {/* 오버레이 */}
            <div
              className={cn(
                'fixed inset-0 z-40 bg-background-dimmer transition-opacity duration-300',
                isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              onClick={close}
            />

            {/* 좌측 슬라이드 패널 */}
            <div
              className={cn(
                'app-shell-drawer fixed left-0 top-0 z-50 flex h-full w-4/5 max-w-xs flex-col bg-background-default transition-transform duration-300',
                isOpen ? 'translate-x-0' : '-translate-x-full',
              )}
            >
              {/* 패널 헤더 */}
              <div className="flex items-center justify-between border-b border-border-subtle px-400 py-300">
                <div className="flex items-center gap-100">
                  <Image
                    src="/icons/logo.svg"
                    alt="Logo"
                    width={18}
                    height={18}
                  />
                  <Link
                    href="/home"
                    aria-label="홈"
                    className="inline-flex min-h-550 items-center"
                  >
                    <Image
                      src="/icons/logo_title.svg"
                      alt="ZERO-ONE"
                      width={106}
                      height={11}
                    />
                  </Link>
                </div>
                <div className="flex items-center gap-200">
                  {isLoggedIn && (
                    <Link
                      href="/my-page"
                      onClick={close}
                      aria-label="마이페이지"
                    >
                      <Avatar
                        image={userImg}
                        size={32}
                        fallbackSrc={getDefaultAvatarSrc(memberId)}
                      />
                    </Link>
                  )}
                  <IconButton
                    onClick={close}
                    label="메뉴 닫기"
                    size="md"
                    className="p-100 hover:bg-transparent"
                  >
                    <Image
                      src="/icons/modal-close.svg"
                      alt="닫기"
                      width={24}
                      height={24}
                    />
                  </IconButton>
                </div>
              </div>

              {/* 네비게이션 */}
              <nav className="flex flex-col px-400 py-300">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname.startsWith(item.href);

                  if (item.comingSoon) {
                    return (
                      <div
                        key={item.label}
                        className="flex cursor-default items-center gap-150 py-200"
                      >
                        <span
                          className={cn(
                            'font-designer-14m',
                            isActive ? 'text-text-brand' : 'text-text-subtle',
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="font-designer-13m whitespace-nowrap rounded-100 bg-background-brand-default px-125 py-75 text-gray-0">
                          Coming Soon
                        </span>
                      </div>
                    );
                  }

                  const navClassName = cn(
                    'font-designer-14m flex items-center gap-150 py-200 text-text-subtle',
                    isActive && 'text-text-brand',
                  );
                  const navContent = (
                    <>
                      {item.label}
                      {item.badge && (
                        <span className="font-designer-13m animate-[pulse_1.6s_ease-in-out_infinite] whitespace-nowrap rounded-100 bg-background-brand-default px-125 py-75 text-gray-0">
                          {item.badge}
                        </span>
                      )}
                    </>
                  );

                  if (item.external) {
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        onClick={close}
                        className={navClassName}
                      >
                        {navContent}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={close}
                      className={navClassName}
                    >
                      {navContent}
                    </Link>
                  );
                })}
              </nav>

              {/* 하단 인증 버튼 */}
              <div className="border-t border-border-subtle px-400 py-300">
                <PwaInstallMenuItem onInstalled={close} />
                {isLoggedIn ? (
                  <div className="flex flex-col gap-200">
                    <Link
                      href="/my-page"
                      onClick={close}
                      className="font-designer-14m flex min-h-550 items-center text-text-subtle"
                    >
                      마이페이지
                    </Link>
                    <TextActionButton
                      onClick={() => {
                        close();
                        setLogoutConfirmOpen(true);
                      }}
                      className="justify-start border-0 p-0 text-left"
                    >
                      로그아웃
                    </TextActionButton>
                  </div>
                ) : (
                  <LoginModal
                    openTrigger={
                      <TextActionButton className="border-0 p-0">
                        로그인 / 회원가입
                      </TextActionButton>
                    }
                  />
                )}
              </div>
            </div>
          </>,
          document.body,
        )}

      <LogoutConfirmModal
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
      />
    </>
  );
}
