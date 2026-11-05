export const META_PIXEL_ID = '2062862517731909';
export const KARROT_PIXEL_ID = '1793082750790836001';

const PENDING_KARROT_PURCHASE_KEY = 'zo:conversion:karrot-purchase';

type ConversionWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  karrotPixel?: { track: (...args: unknown[]) => void };
  gtag?: (...args: unknown[]) => void;
};

/**
 * 픽셀은 페이지 주소를 통째로 보낸다. 결제 복귀 주소에는 paymentKey 가,
 * 소셜 로그인 복귀 주소에는 인가 코드가 실려 오므로 이 경로에서는 띄우지 않는다.
 */
export function isAdPixelExcludedPath(pathname: string): boolean {
  return (
    /\/payment(\/|$)/.test(pathname) || pathname.startsWith('/redirection')
  );
}

function firstTime(key: string): boolean {
  try {
    if (window.localStorage.getItem(key) !== null) return false;
    window.localStorage.setItem(key, '1');
  } catch {
    // 저장이 막힌 브라우저는 호출 지점의 단발성(서버 성공 콜백)에 맡긴다.
  }
  return true;
}

function sendGa4(name: string, params: Record<string, unknown> = {}) {
  const win = window as ConversionWindow;
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  // GTM 의 G-Q02V90592K 로 중복되지 않게 페이지 속성으로만 보낸다.
  win.gtag?.('event', name, { ...params, send_to: measurementId });
}

/** 호출 지점: 회원가입 API 성공 콜백. 서버가 계정을 만든 뒤에만 부른다. */
export function trackSignUp(memberId: string) {
  if (typeof window === 'undefined') return;
  if (!firstTime(`zo:conversion:sign_up:${memberId}`)) return;
  const win = window as ConversionWindow;
  win.fbq?.('track', 'CompleteRegistration');
  win.karrotPixel?.track('CompleteRegistration');
  sendGa4('sign_up');
}

/** 호출 지점: 리드 저장 API 성공 콜백. 이메일·전화번호는 넣지 않는다. */
export function trackLead(
  formName: 'study_ready_form' | 'retention_onboarding',
) {
  if (typeof window === 'undefined') return;
  if (!firstTime(`zo:conversion:lead:${formName}`)) return;
  const win = window as ConversionWindow;
  win.fbq?.('track', 'Lead');
  win.karrotPixel?.track('Lead');
  sendGa4('generate_lead', { form_name: formName });
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

/**
 * 결제 복귀 화면에는 픽셀이 없다. Meta 는 주소를 깨끗이 지정한 추적 요청을 직접 보내고,
 * 당근은 다음 화면에서 픽셀이 뜰 때 보낸다(flushPendingKarrotPurchase).
 * amount 는 결제 승인 API 응답 값만 넘긴다. 주소의 amount 쿼리를 쓰지 않는다.
 */
export function trackPurchase(orderId: string, amount: unknown) {
  if (typeof window === 'undefined') return;
  if (
    typeof amount !== 'number' ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  )
    return;
  if (!firstTime(`zo:conversion:purchase:${orderId}`)) return;

  const query = new URLSearchParams({
    id: META_PIXEL_ID,
    ev: 'Purchase',
    eid: `purchase-${orderId}`,
    dl: `${window.location.origin}${window.location.pathname}`,
    'cd[value]': String(amount),
    'cd[currency]': 'KRW',
    noscript: '1',
  });
  const fbp = readCookie('_fbp');
  const fbc = readCookie('_fbc');
  if (fbp) query.set('fbp', fbp);
  if (fbc) query.set('fbc', fbc);
  new Image().src = `https://www.facebook.com/tr/?${query.toString()}`;

  sendGa4('purchase', {
    transaction_id: orderId,
    value: amount,
    currency: 'KRW',
  });

  try {
    window.localStorage.setItem(
      PENDING_KARROT_PURCHASE_KEY,
      JSON.stringify({ amount }),
    );
  } catch {
    return;
  }
  flushPendingKarrotPurchase();
}

export function flushPendingKarrotPurchase() {
  if (typeof window === 'undefined') return;
  const win = window as ConversionWindow;
  if (!win.karrotPixel) return;
  try {
    const pending = window.localStorage.getItem(PENDING_KARROT_PURCHASE_KEY);
    if (!pending) return;
    window.localStorage.removeItem(PENDING_KARROT_PURCHASE_KEY);
    const { amount } = JSON.parse(pending) as { amount: number };
    win.karrotPixel.track('Purchase', { total_price: amount, currency: 'KRW' });
  } catch {
    // 측정 실패는 사용자 흐름을 막지 않는다.
  }
}
