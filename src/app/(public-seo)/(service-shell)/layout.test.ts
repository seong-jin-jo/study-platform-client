import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/sentry-init', () => ({ default: () => null }));
vi.mock(
  '@/components/auth/modals/onboarding-modal/global-onboarding-gate',
  () => ({
    GlobalOnboardingGate: () => null,
  }),
);
vi.mock('@/components/common/layout/mobile-tab-bar', () => ({
  default: () => null,
}));
vi.mock('@/components/common/layout/public-home-header', () => ({
  default: () => null,
}));
vi.mock('@/components/common/ui/floating-class-action-buttons', () => ({
  ServiceFloatingClassActionButtons: () => null,
}));
vi.mock('next/image', () => ({
  default: () => createElement('img', { alt: 'logo' }),
}));

import PublicServiceShell from './layout';

// 회귀 방지: 0b2d8e53 에서 홈이 이 shell 로 옮겨지며 Footer(사업자 정보)가 빠져
// 홈에 하단 사업자 정보가 사라졌다. 이 shell 은 반드시 Footer 를 렌더해야 한다.
describe('PublicServiceShell', () => {
  it('renders the business-info Footer below the content', () => {
    const html = renderToStaticMarkup(
      createElement(PublicServiceShell, null, createElement('p', null, 'BODY')),
    );

    expect(html).toContain('<footer');
    expect(html).toContain('사업자등록번호');
    expect(html.indexOf('BODY')).toBeLessThan(html.indexOf('<footer'));
  });
});
