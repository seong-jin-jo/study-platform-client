import { createRequire } from 'node:module';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AUTH_SESSION_STATES } from '@/types/auth/domain';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => { window: Window & typeof globalThis };
};

const authState = vi.hoisted(() => ({
  isHydrated: true,
  memberId: undefined as number | undefined,
  sessionState: 'anonymous',
}));

vi.mock('next/dynamic', () => {
  let dynamicIndex = 0;

  return {
    default: () => {
      dynamicIndex += 1;

      return dynamicIndex === 1
        ? ({ openTrigger }: { openTrigger: ReactNode }) => openTrigger
        : () => createElement('button', { type: 'button' }, '알림');
    },
  };
});
vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@/features/auth/model/use-auth', () => ({
  useAuthReady: () => authState,
}));
vi.mock('@/hooks/queries/class-onboarding/use-class-onboarding', () => ({
  useClassOnboardingStatusQuery: () => ({
    data: { lastSavedStep: 'COMPLETED', completedAt: '2026-08-20' },
  }),
}));
vi.mock('@/stores/use-user-store', () => ({
  useUserStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ memberId: null, nickname: null, profileImageUrl: null }),
}));
vi.mock('./header-nav', () => ({
  default: () => createElement('nav', null, '메인 메뉴'),
}));
vi.mock('./header-user-dropdown', () => ({
  default: () => createElement('button', { type: 'button' }, '사용자 메뉴'),
}));
vi.mock('./mobile-menu-drawer', () => ({
  default: () => createElement('button', { type: 'button' }, '모바일 메뉴'),
}));

import HomeHeaderClient from './home-header-client';

function renderHeader(
  initialSessionState: 'anonymous' | 'authenticated-member',
) {
  const html = renderToStaticMarkup(
    createElement(HomeHeaderClient, {
      initialSessionState,
      initialAuthenticatedMemberId:
        initialSessionState === AUTH_SESSION_STATES.AUTHENTICATED_MEMBER
          ? 7
          : undefined,
      initialOnboardingCompleted: true,
    }),
  );

  return new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url: 'http://localhost',
  }).window.document.body;
}

describe('home header audience controls', () => {
  it('shows only the Kakao start action to an anonymous visitor', () => {
    authState.sessionState = AUTH_SESSION_STATES.ANONYMOUS;
    authState.memberId = undefined;
    const body = renderHeader(AUTH_SESSION_STATES.ANONYMOUS);

    expect(body.textContent).toContain('로그인 / 회원가입');
    expect(body.textContent).not.toContain('글쓰기');
    expect(body.textContent).not.toContain('알림');
  });

  it('preserves write and notification actions for an onboarded member', () => {
    authState.sessionState = AUTH_SESSION_STATES.AUTHENTICATED_MEMBER;
    authState.memberId = 7;
    const body = renderHeader(AUTH_SESSION_STATES.AUTHENTICATED_MEMBER);

    expect(body.textContent).toContain('글쓰기');
    expect(body.textContent).toContain('알림');
    expect(body.textContent).not.toContain('로그인 / 회원가입');
    expect(body.querySelector('a[href="/community/write"]')).not.toBeNull();
  });

  it('renders the guest CTA on first paint before hydration resolves (regression: 2026-08-25 empty home header)', () => {
    // public-seo 레이아웃(홈 "/" 등)은 서버가 세션을 강제 익명 처리하고,
    // 클라이언트 hydration 이전(useAuthReady().isHydrated === false)에도
    // 헤더 우측이 빈 스켈레톤이 아니라 게스트 버튼으로 SSR돼야 한다.
    authState.isHydrated = false;
    authState.sessionState = AUTH_SESSION_STATES.ANONYMOUS;
    authState.memberId = undefined;
    const body = renderHeader(AUTH_SESSION_STATES.ANONYMOUS);

    expect(body.textContent).toContain('로그인 / 회원가입');
    expect(body.querySelector('[role="status"]')).toBeNull();

    authState.isHydrated = true;
  });
});
