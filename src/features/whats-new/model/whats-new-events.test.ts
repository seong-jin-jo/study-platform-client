import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  trackWhatsNewFeedback,
  trackWhatsNewTry,
  trackWhatsNewView,
} from './whats-new-events';

const sentCommands = () =>
  (window.dataLayer as unknown as ArrayLike<unknown>[]).map((command) =>
    Array.from(command),
  );

describe('새로운 기능 카드 GA4 이벤트', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-S976B2DH4R');
    vi.stubGlobal('window', {});
  });

  it('WHATS-NEW-030 whats_new_view 는 version 을 담아 G-S976B2DH4R 로 보낸다', () => {
    trackWhatsNewView('0.10.12');
    expect(sentCommands()).toEqual([
      [
        'event',
        'whats_new_view',
        { version: '0.10.12', send_to: 'G-S976B2DH4R' },
      ],
    ]);
  });

  it('WHATS-NEW-031 whats_new_try 는 version 과 href 를 담는다', () => {
    trackWhatsNewTry('0.10.12', '/updates');
    expect(sentCommands()).toEqual([
      [
        'event',
        'whats_new_try',
        { version: '0.10.12', href: '/updates', send_to: 'G-S976B2DH4R' },
      ],
    ]);
  });

  it('WHATS-NEW-032 whats_new_feedback 은 version 과 method 를 담는다', () => {
    trackWhatsNewFeedback('0.10.12', 'inquiry_link');
    expect(sentCommands()).toEqual([
      [
        'event',
        'whats_new_feedback',
        {
          version: '0.10.12',
          method: 'inquiry_link',
          send_to: 'G-S976B2DH4R',
        },
      ],
    ]);
  });

  it('WHATS-NEW-033 측정 ID 가 없으면 아무것도 보내지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');
    trackWhatsNewView('0.10.12');
    expect(window.dataLayer).toBeUndefined();
  });
});
