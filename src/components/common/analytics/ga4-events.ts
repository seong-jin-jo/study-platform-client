'use client';

// GoogleAnalyticsCookieSafe(google-analytics-cookie-safe.tsx)가 자체 dataLayer 초기화 스크립트로
// GA4 를 붙이기 때문에, @next/third-parties 의 sendGAEvent 는 못 쓴다 — 그 함수는
// 자기 <GoogleAnalytics> 컴포넌트가 렌더될 때만 채워지는 모듈 내부 변수를 참조해,
// 우리처럼 그 컴포넌트를 렌더하지 않는 경우 "GA has not been initialized" 로 조용히 no-op 된다.
// window.dataLayer 에 직접 push하는 것은 gtag()가 내부적으로 하는 것과 동일한 동작이다.
export function trackGa4Event(name: 'signup_complete' | 'lead_submit') {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['event', name]);
}
