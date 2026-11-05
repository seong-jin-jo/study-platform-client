'use client';

// GoogleAnalyticsCookieSafe(google-analytics-cookie-safe.tsx)가 자체 dataLayer 초기화 스크립트로
// GA4 를 붙이기 때문에, @next/third-parties 의 sendGAEvent 는 못 쓴다 — 그 함수는
// 자기 <GoogleAnalytics> 컴포넌트가 렌더될 때만 채워지는 모듈 내부 변수를 참조해,
// 우리처럼 그 컴포넌트를 렌더하지 않는 경우 "GA has not been initialized" 로 조용히 no-op 된다.
//
// gtag.js 는 dataLayer 에서 arguments 객체만 명령으로 읽는다. 배열을 넣으면 오류 없이 버려진다
// (2026-11-06 운영 headless 실측: 배열 형식 collect 0건, arguments 형식 G-S976B2DH4R collect 1건).
// 그래서 gtag() 와 같은 형식으로 넣는다. 라이브러리가 뜨기 전에 불려도 큐에 남아 전송된다.
function pushGtagCommand(..._command: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params -- gtag.js 는 배열이 아니라 arguments 객체만 읽는다.
  (window.dataLayer as unknown[]).push(arguments);
}

export function trackGa4Event(name: 'signup_complete' | 'lead_submit') {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  if (typeof window === 'undefined') return;

  // GTM 의 G-Q02V90592K 로 새지 않게 수집기가 읽는 페이지 속성으로만 보낸다(ad-conversions.ts 와 같은 규칙).
  pushGtagCommand('event', name, { send_to: measurementId });
}
