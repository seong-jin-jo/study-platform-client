import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackGa4Event } from './ga4-events';

describe('trackGa4Event', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST');
    vi.stubGlobal('window', {});
  });

  it('gtag.js 가 읽는 arguments 객체로 넣는다. 배열이면 조용히 버려진다', () => {
    trackGa4Event('signup_complete');

    const [command] = window.dataLayer as unknown as unknown[];
    expect(Array.isArray(command)).toBe(false);
    expect(Object.prototype.toString.call(command)).toBe('[object Arguments]');
    expect(Array.from(command as ArrayLike<unknown>)).toEqual([
      'event',
      'signup_complete',
      { send_to: 'G-TEST' },
    ]);
  });

  it('기존 dataLayer 뒤에 이어 붙인다', () => {
    window.dataLayer = [{ event: 'page_view' }] as never;

    trackGa4Event('lead_submit');

    expect(window.dataLayer).toHaveLength(2);
  });

  it('측정 ID 가 없으면 아무것도 넣지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');

    trackGa4Event('lead_submit');

    expect(window.dataLayer).toBeUndefined();
  });
});
