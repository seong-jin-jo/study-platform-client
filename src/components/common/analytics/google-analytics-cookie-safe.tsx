'use client';

import Script from 'next/script';

/**
 * GA4 쿠키 도메인 수동 고정.
 *
 * `@next/third-parties`의 <GoogleAnalytics> 는 `gtag('config', gaId)` 만 호출해
 * 쿠키 도메인이 GA 기본값인 'auto' 로 남는다. 'auto' 는 정식 Public Suffix List 를
 * 안 쓰는 자체 휴리스틱으로 도메인을 2단(label)까지만 잘라 붙이는데,
 * '.kr' 아래의 'it.kr' 은 실제로 한국에서 co.kr/or.kr 처럼 공개 등록 접미사(PSL 등재)라
 * 브라우저가 이 도메인으로의 쿠키 설정을 거부한다(Firefox 는 PSL 을 엄격히 검사).
 * 그 결과 test.zeroone.it.kr 방문자의 _ga/_ga_<ID> 쿠키가 'it.kr' 로 잘못 스코프돼
 * 매 요청 콘솔에 쿠키 거부 경고가 3건씩 찍혔다(2026-08-23 QA, cross-browser-matrix.md).
 *
 * 인증 refresh_token 쿠키는 이미 3단 도메인 'zeroone.it.kr' 을 명시로 박아 정상
 * 동작 중이다(auth-cookies.ts ZEROONE_COOKIE_DOMAIN). 같은 값을 GA 설정 호출에도
 * 그대로 넣어 'auto' 추측을 없앤다 — dev(test.zeroone.it.kr)·prod(zeroone.it.kr,
 * www.zeroone.it.kr) 모두 동일하게 유효한 등록 도메인이라 이 값 하나로 양쪽 다 커버된다.
 *
 * `cookie_domain` 은 gtag 의 `config` 호출 자체의 파라미터라 `js`+`config` 를
 * 한 스크립트 안에서 원자적으로 실행한다 — 이후 별도 `set` 커맨드로 뒤늦게
 * 덮어쓰면 초기 config 가 이미 'auto' 로 쿠키를 써버린 뒤일 수 있어 신뢰할 수 없다.
 */
const GA_COOKIE_DOMAIN = 'zeroone.it.kr';

export function GoogleAnalyticsCookieSafe({ gaId }: { gaId: string }) {
  return (
    <>
      <Script
        id="_ga-cookie-safe-init"
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaId}', { cookie_domain: '${GA_COOKIE_DOMAIN}' });`,
        }}
      />
      <Script
        id="_ga-cookie-safe-lib"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
    </>
  );
}
