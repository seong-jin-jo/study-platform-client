import { describe, expect, it, vi } from 'vitest';

import {
  isIosSafari,
  isStandaloneDisplayMode,
  PWA_INSTALL_PROMPT_PROPERTY,
  readStoredPwaInstallPrompt,
  shouldRegisterPwaServiceWorker,
} from './pwa';

describe('PWA runtime contracts', () => {
  it('PWA-UNIT-001 standalone 표시 모드 또는 iOS standalone을 설치 완료로 판정한다', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));

    expect(
      isStandaloneDisplayMode(
        { matchMedia } as unknown as Window,
        { standalone: false } as unknown as Navigator,
      ),
    ).toBe(true);
    expect(
      isStandaloneDisplayMode(
        {
          matchMedia: vi.fn(() => ({ matches: false })),
        } as unknown as Window,
        { standalone: true } as unknown as Navigator,
      ),
    ).toBe(true);
  });

  it('PWA-UNIT-002 Chrome iOS를 Safari 설치 안내 대상으로 오인하지 않는다', () => {
    expect(
      isIosSafari(
        'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/125 Mobile/15E148 Safari/604.1',
        'Apple Computer, Inc.',
        5,
      ),
    ).toBe(false);
    expect(
      isIosSafari(
        'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        'Apple Computer, Inc.',
        5,
      ),
    ).toBe(true);
  });

  it('PWA-UNIT-003 production과 명시적 활성화에서만 서비스워커를 등록한다', () => {
    expect(
      shouldRegisterPwaServiceWorker({
        nodeEnv: 'production',
        enabled: true,
        hasServiceWorker: true,
      }),
    ).toBe(true);
    expect(
      shouldRegisterPwaServiceWorker({
        nodeEnv: 'development',
        enabled: true,
        hasServiceWorker: true,
      }),
    ).toBe(false);
    expect(
      shouldRegisterPwaServiceWorker({
        nodeEnv: 'production',
        enabled: false,
        hasServiceWorker: true,
      }),
    ).toBe(false);
    expect(
      shouldRegisterPwaServiceWorker({
        nodeEnv: 'production',
        enabled: true,
        hasServiceWorker: false,
      }),
    ).toBe(false);
  });

  it('PWA-UNIT-004 루트가 보관한 설치 이벤트를 컴포넌트 수명과 무관하게 읽는다', () => {
    const prompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    };
    const storedWindow = {
      [PWA_INSTALL_PROMPT_PROPERTY]: prompt,
    } as unknown as Window;

    expect(readStoredPwaInstallPrompt(storedWindow)).toBe(prompt);
    expect(readStoredPwaInstallPrompt({} as Window)).toBeUndefined();
  });
});
