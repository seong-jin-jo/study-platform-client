// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PwaRuntime from './pwa-runtime';

describe('PWA 런타임 서비스워커 등록', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('PWA-RUNTIME-001 등록 거절을 관측하고 미처리 예외로 전파하지 않는다', async () => {
    const registrationError = new Error('synthetic registration failure');
    const register = vi.fn().mockRejectedValue(registrationError);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        register,
        removeEventListener: vi.fn(),
      },
    });
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })),
    });

    await act(async () => {
      root.render(createElement(PwaRuntime));
      await Promise.resolve();
    });

    expect(register).toHaveBeenCalledWith(
      expect.stringMatching(/^\/sw\.js\?v=/),
      { scope: '/' },
    );
    await vi.waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        '[PWA] 서비스워커 등록에 실패했습니다.',
        registrationError,
      ),
    );
  });
});
