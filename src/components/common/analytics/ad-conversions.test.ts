import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAdPixelExcludedPath,
  trackLead,
  trackPurchase,
  trackSignUp,
} from './ad-conversions';

const fbq = vi.fn();
const track = vi.fn();
const gtag = vi.fn();
const images: string[] = [];

beforeEach(() => {
  fbq.mockClear();
  track.mockClear();
  gtag.mockClear();
  images.length = 0;
  vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST');
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    fbq,
    gtag,
    karrotPixel: { track },
    location: {
      origin: 'https://www.zeroone.it.kr',
      pathname: '/payment/success',
    },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  });
  vi.stubGlobal('document', { cookie: '' });
  vi.stubGlobal(
    'Image',
    class {
      set src(value: string) {
        images.push(value);
      }
    },
  );
});

describe('광고 전환', () => {
  it('구매는 서버 금액으로 한 번만, 주소 쿼리 없이 나간다', () => {
    trackPurchase('order-1', 49000);
    trackPurchase('order-1', 49000);
    expect(images).toHaveLength(1);
    expect(images[0]).toContain('cd%5Bvalue%5D=49000');
    expect(images[0]).not.toContain('paymentKey');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('Purchase', {
      total_price: 49000,
      currency: 'KRW',
    });
    expect(gtag).toHaveBeenCalledWith('event', 'purchase', {
      transaction_id: 'order-1',
      value: 49000,
      currency: 'KRW',
      send_to: 'G-TEST',
    });
  });

  it('금액이 양의 정수가 아니면 구매를 보내지 않는다', () => {
    trackPurchase('order-2', undefined);
    trackPurchase('order-3', 0);
    expect(images).toHaveLength(0);
  });

  it('가입과 리드는 한 번만 나간다', () => {
    trackSignUp('7');
    trackSignUp('7');
    trackLead('study_ready_form');
    trackLead('study_ready_form');
    expect(fbq.mock.calls).toEqual([
      ['track', 'CompleteRegistration'],
      ['track', 'Lead'],
    ]);
    expect(track.mock.calls).toEqual([['CompleteRegistration'], ['Lead']]);
    expect(gtag).toHaveBeenCalledWith('event', 'sign_up', {
      send_to: 'G-TEST',
    });
  });

  it('결제·로그인 복귀 경로는 픽셀 제외 대상이다', () => {
    expect(isAdPixelExcludedPath('/payment/success')).toBe(true);
    expect(isAdPixelExcludedPath('/class/a/payment/success')).toBe(true);
    expect(isAdPixelExcludedPath('/redirection')).toBe(true);
    expect(isAdPixelExcludedPath('/class/a')).toBe(false);
  });
});
