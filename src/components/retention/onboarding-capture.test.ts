import { createRequire } from 'node:module';
import { act, createElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => { window: Window & typeof globalThis };
};

const testState = vi.hoisted(() => ({
  cohortCode: null as string | null,
  requests: [] as unknown[],
  routerPush: vi.fn(),
  seminarAssigned: true,
  showToast: vi.fn(),
}));

async function renderInDom(element: ReactElement) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/onboarding/retention',
  });

  vi.stubGlobal('window', dom.window);
  vi.stubGlobal('document', dom.window.document);
  vi.stubGlobal('navigator', dom.window.navigator);
  vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
  vi.stubGlobal('Element', dom.window.Element);
  vi.stubGlobal('Node', dom.window.Node);
  vi.stubGlobal('Event', dom.window.Event);
  vi.stubGlobal('MouseEvent', dom.window.MouseEvent);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

  const container = dom.window.document.createElement('div');
  dom.window.document.body.append(container);
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);

  await act(async () => root.render(element));
  return { container, root };
}

const clickButton = async (container: Element, label: string) => {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.includes(label),
  );
  expect(button, `${label} 버튼`).toBeTruthy();
  await act(async () => button?.click());
};

const fillEmail = async (container: Element) => {
  const input = container.querySelector<HTMLInputElement>('#retention-email');
  expect(input).toBeTruthy();
  await act(async () => {
    if (!input) return;
    const valueSetter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(input) as HTMLInputElement,
      'value',
    )?.set;
    valueSetter?.call(input, 'retention-unit@zeroone.it.kr');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as ReactNode),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: testState.routerPush }),
  useSearchParams: () =>
    new URLSearchParams(
      testState.cohortCode ? { cohort: testState.cohortCode } : undefined,
    ),
}));
vi.mock('@/components/auth/modals/login-modal', () => ({
  default: ({ openTrigger }: { openTrigger: ReactNode }) => openTrigger,
}));
vi.mock('@/components/common/analytics/ga4-events', () => ({
  trackGa4Event: vi.fn(),
}));
vi.mock('@/components/common/modals/phone-verification-modal', () => ({
  default: () => null,
}));
vi.mock('@/components/common/ui/button', () => ({
  default: ({
    children,
    color: _color,
    size: _size,
    ...props
  }: Record<string, unknown>) =>
    createElement('button', props, children as ReactNode),
}));
vi.mock('@/components/retention/retention-shell', () => ({
  RetentionPage: ({ children }: { children: ReactNode }) =>
    createElement('main', null, children),
}));
vi.mock('@/features/auth/model/use-auth', () => ({
  useAuthReady: () => ({
    isHydrated: true,
    sessionState: 'authenticated-member',
  }),
}));
vi.mock('@/hooks/queries/retention/use-retention-queries', () => ({
  useRetentionOnboardingMutation: () => ({
    isPending: false,
    mutate: (
      request: unknown,
      options: { onSuccess: (response: Record<string, unknown>) => void },
    ) => {
      testState.requests.push(request);
      options.onSuccess({ seminarAssigned: testState.seminarAssigned });
    },
  }),
}));
vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: () => testState.showToast,
}));
vi.mock('@/utils/attribution-tracker', () => ({
  getAttributionData: () => null,
}));

import OnboardingCapture from './onboarding-capture';

describe('리텐션 온보딩 완료 이동', () => {
  beforeEach(() => {
    testState.cohortCode = null;
    testState.requests = [];
    testState.seminarAssigned = true;
    testState.routerPush.mockReset();
    testState.showToast.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('일반 성공은 인증 홈으로 이동하고 기존 폼 payload를 보존한다', async () => {
    const { container, root } = await renderInDom(
      createElement(OnboardingCapture),
    );

    await clickButton(container, '웹앱 수익화');
    await fillEmail(container);
    await clickButton(container, '이메일로 새 글과 프로그램 소식 받기');
    await clickButton(container, '목표 방으로 들어가기');

    expect(testState.requests).toEqual([
      expect.objectContaining({
        cohortCode: null,
        email: 'retention-unit@zeroone.it.kr',
        emailMarketingConsent: true,
        roomGoalType: 'WEBAPP_MONETIZATION',
      }),
    ]);
    expect(testState.routerPush).toHaveBeenCalledOnce();
    expect(testState.routerPush).toHaveBeenCalledWith('/');
    await act(async () => root.unmount());
  });

  it('세미나 자동 배정 실패는 입력 완료를 유지하고 인증 홈 링크를 안내한다', async () => {
    testState.cohortCode = 'e2e-retention';
    testState.seminarAssigned = false;
    const { container, root } = await renderInDom(
      createElement(OnboardingCapture),
    );

    await clickButton(container, '웹앱 수익화');
    await fillEmail(container);
    await clickButton(container, '목표 방으로 들어가기');

    expect(testState.requests).toEqual([
      expect.objectContaining({ cohortCode: 'e2e-retention' }),
    ]);
    expect(testState.routerPush).not.toHaveBeenCalled();
    expect(container.textContent).toContain('기수에 자동 배정되지 않았어요.');
    expect(
      Array.from(container.querySelectorAll('a'))
        .find((anchor) => anchor.textContent?.includes('홈으로 이동하기'))
        ?.getAttribute('href'),
    ).toBe('/');
    await act(async () => root.unmount());
  });
});
