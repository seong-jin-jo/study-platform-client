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
  close: vi.fn(),
  mutate: vi.fn(),
  routerPush: vi.fn(),
  trackSignUp: vi.fn(),
  trackGa4Event: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ isPending: false, mutate: testState.mutate }),
}));
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => createElement('img', props),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: testState.routerPush }),
}));
vi.mock('@/components/common/analytics/ga4-events', () => ({
  trackGa4Event: testState.trackGa4Event,
}));
vi.mock('@/components/common/analytics/ad-conversions', () => ({
  trackSignUp: testState.trackSignUp,
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
vi.mock('@/features/auth/model/client-auth-session', () => ({
  writeAccessTokenSession: vi.fn(),
}));
vi.mock('@/hooks/queries/auth/use-auth-mutation', () => ({
  useUploadProfileImageMutation: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/stores/use-onboarding-store', () => ({
  useOnboardingStore: () => ({ close: testState.close }),
}));
vi.mock('@/stores/use-toast-store', () => ({
  useToastStore: { getState: () => ({ showToast: vi.fn() }) },
}));

import { Step4Completion } from './step-4-completion';

async function renderInDom(element: ReactElement) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/onboarding',
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

describe('소셜 로그인 가입 완료 계측', () => {
  beforeEach(() => {
    testState.close.mockReset();
    testState.mutate.mockReset();
    testState.routerPush.mockReset();
    testState.trackSignUp.mockReset();
    testState.trackGa4Event.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('회원 가입 성공 콜백이 중복돼도 signup_complete를 한 번만 보낸다', async () => {
    testState.mutate.mockImplementation(
      async (
        _request,
        options: { onSuccess: (response: object) => Promise<void> },
      ) => {
        const response = {
          content: { accessToken: 'unit-token', generatedMemberId: 900001 },
        };
        await options.onSuccess(response);
        await options.onSuccess(response);
      },
    );
    const onSubmittingChange = vi.fn();
    const { container, root } = await renderInDom(
      createElement(Step4Completion, {
        data: { nickname: '제로원', goals: [] },
        onSubmittingChange,
      }),
    );

    const finishButton = container.querySelector('button');
    expect(finishButton).toBeTruthy();
    await act(async () => finishButton?.click());

    expect(testState.trackGa4Event).toHaveBeenCalledOnce();
    expect(testState.trackGa4Event).toHaveBeenCalledWith('signup_complete');
    expect(testState.trackSignUp).toHaveBeenCalledTimes(2);
    expect(testState.trackSignUp).toHaveBeenCalledWith('900001');
    expect(onSubmittingChange).toHaveBeenCalledWith(true);
    await act(async () => root.unmount());
  });

  it('회원 가입 실패에서는 signup_complete를 보내지 않는다', async () => {
    testState.mutate.mockImplementation(
      (_request, options: { onError: () => void }) => options.onError(),
    );
    const { container, root } = await renderInDom(
      createElement(Step4Completion, {
        data: { nickname: '제로원', goals: [] },
        onSubmittingChange: vi.fn(),
      }),
    );

    await act(async () => container.querySelector('button')?.click());

    expect(testState.trackGa4Event).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
