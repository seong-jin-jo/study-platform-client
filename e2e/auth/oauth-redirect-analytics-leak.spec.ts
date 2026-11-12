import { expect, type Page, test } from '@playwright/test';

/**
 * 로그인 복귀 주소(/redirection)의 액세스 토큰·회원 번호가 분석 도구로 나가지 않는지 본다.
 *
 * 배경(2026-11-13): 운영에서 이 주소가 열릴 때 GA4 page_view·scroll 요청의 dl(page_location)에
 * access-token 과 member-id 가 그대로 실려 GA4 에 저장됐다. 액세스 토큰 수명은 1시간이다.
 *
 * 분석 도메인으로 가는 요청은 전부 여기서 가로챈다. 태그 로더(스크립트 GET)만 통과시키고
 * 수집 요청(collect·tr·clarity 등)은 abort 해서 외부로는 아무것도 보내지 않는다.
 * 측정 ID 환경변수가 비면 태그가 안 떠서 이 검사는 빈 통과가 되므로, 분석 요청이 0건이면
 * 통과로 세지 않고 skip 으로 드러낸다. 로컬에서는 실제 ID 를 환경변수로 넣고 돌린다
 * (NEXT_PUBLIC_GA_MEASUREMENT_ID / NEXT_PUBLIC_GTM_ID / NEXT_PUBLIC_CLARITY_PROJECT_ID).
 */
const ANALYTICS_HOST =
  /(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|clarity\.ms|facebook\.(com|net)|daangn\.com)/;
const LIBRARY_LOAD =
  /(googletagmanager\.com\/(gtag\/js|gtm\.js)|clarity\.ms\/tag\/|scripts\.clarity\.ms\/.*\.js|connect\.facebook\.net\/.*fbevents\.js|karrot-pixel\.business\.daangn\.com\/karrot-pixel\.js)/;

const FAKE_TOKEN = 'FAKE.TOKEN.VALUE';
const MEMBER_ID = '999';

const base64Url = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * 서명 없는 JWT. 클라이언트는 서명을 검증하지 않고 payload 의 memberId 와 redirect 의
 * member-id 가 같은지만 본다(writeExistingMemberSession). 실제 토큰이 아니다.
 */
const buildUnsignedJwt = (): string =>
  [
    base64Url({ alg: 'none', typ: 'JWT' }),
    base64Url({
      memberId: Number(MEMBER_ID),
      roleIds: ['ROLE_MEMBER'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    'unsigned',
  ].join('.');

const buildRedirectPath = (accessToken: string): string =>
  '/redirection?type=oauth2&is-success=true&is-guest=false&auth-vendor=google' +
  `&access-token=${accessToken}&member-id=${MEMBER_ID}`;

const leaks = (text: string, extraNeedle?: string): boolean =>
  /FAKE\.TOKEN/.test(text) ||
  /member-id(=|%3D)999/i.test(text) ||
  /access-token/i.test(text) ||
  (extraNeedle !== undefined && text.includes(extraNeedle));

interface Intercepted {
  url: string;
  body: string;
  kind: 'library' | 'collect';
}

/** 분석 도메인 요청을 가로챈다. 로더 GET 만 통과시키고 나머지는 abort 한다. */
const interceptAnalytics = async (page: Page): Promise<Intercepted[]> => {
  const seen: Intercepted[] = [];

  await page.route(ANALYTICS_HOST, async (route) => {
    const request = route.request();
    const url = request.url();
    const isLibrary = LIBRARY_LOAD.test(url) && request.method() === 'GET';
    seen.push({
      url,
      body: request.postData() ?? '',
      kind: isLibrary ? 'library' : 'collect',
    });
    if (isLibrary) {
      await route.continue();

      return;
    }
    await route.abort();
  });

  return seen;
};

/** 분석 수집 요청이 실제로 나갈 때까지 기다린다. 안 나오면(측정 ID 없음) false. */
const waitForAnalyticsCollect = async (
  page: Page,
  seen: Intercepted[],
): Promise<boolean> => {
  try {
    await page.waitForRequest(
      (request) =>
        ANALYTICS_HOST.test(request.url()) && !LIBRARY_LOAD.test(request.url()),
      { timeout: 20000 },
    );
    // 같은 묶음의 후속 요청(scroll 등)이 큐에서 나올 짧은 여유.
    await page.mouse.wheel(0, 600);
    await expect.poll(() => seen.length, { timeout: 5000 }).toBeGreaterThan(0);

    return true;
  } catch {
    return false;
  }
};

const expectNoLeak = (
  seen: Intercepted[],
  page: Page,
  addressBarUrls: string[],
  extraNeedle?: string,
): void => {
  const collected = seen.filter((request) => request.kind === 'collect');
  console.info(
    `[analytics] intercepted=${seen.length} library=${seen.length - collected.length} collect=${collected.length}`,
  );

  for (const request of seen) {
    expect(leaks(request.url, extraNeedle), `URL 유출: ${request.url}`).toBe(
      false,
    );
    expect(leaks(request.body, extraNeedle), `본문 유출: ${request.url}`).toBe(
      false,
    );
  }

  expect(leaks(page.url(), extraNeedle), `주소창 유출: ${page.url()}`).toBe(
    false,
  );
  // 복귀 직후 첫 문서 이동 이후의 어떤 주소 변경에도 토큰이 다시 나타나면 안 된다.
  for (const url of addressBarUrls.slice(1)) {
    expect(leaks(url, extraNeedle), `이동 주소 유출: ${url}`).toBe(false);
  }
};

test.describe('OAuth 복귀 주소의 분석 도구 유출 차단', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('/redirection 에서 토큰·member-id 가 분석 요청과 주소창에 남지 않는다 (해석 불가 토큰)', async ({
    page,
  }) => {
    const seen = await interceptAnalytics(page);
    const addressBarUrls: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) addressBarUrls.push(frame.url());
    });

    await page.goto(buildRedirectPath(FAKE_TOKEN), {
      waitUntil: 'domcontentloaded',
    });
    const hasAnalytics = await waitForAnalyticsCollect(page, seen);
    test.skip(
      !hasAnalytics,
      '분석 수집 요청이 0건이다. 측정 ID 환경변수가 없으면 이 검사는 빈 통과가 된다.',
    );

    expectNoLeak(seen, page, addressBarUrls);
  });

  test('정상 토큰 로그인 복귀: 보관값 경로로 로그인이 끝나고 토큰·member-id 가 어디에도 새지 않는다', async ({
    page,
    context,
  }) => {
    const jwt = buildUnsignedJwt();
    const seen = await interceptAnalytics(page);
    const addressBarUrls: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) addressBarUrls.push(frame.url());
    });

    await page.goto(buildRedirectPath(jwt), { waitUntil: 'domcontentloaded' });

    // ① 다음 화면에 도착한다(/redirection 을 벗어난다). /class 등의 데이터 API 가 로컬에서
    //    실패해도 도착한 URL 로 판정한다.
    await page.waitForURL((url) => url.pathname !== '/redirection', {
      timeout: 60000,
    });
    expect(new URL(page.url()).pathname).not.toBe('/login');

    // ③ 세션 쿠키가 저장됐다(토큰 값 자체와 회원 번호).
    const cookies = await context.cookies();
    expect(cookies.some((cookie) => cookie.value === jwt)).toBe(true);
    expect(cookies.some((cookie) => cookie.value === MEMBER_ID)).toBe(true);

    const hasAnalytics = await waitForAnalyticsCollect(page, seen);
    test.skip(
      !hasAnalytics,
      '분석 수집 요청이 0건이다. 측정 ID 환경변수가 없으면 유출 검사는 빈 통과가 된다.',
    );

    // ② 주소창과 모든 분석 요청에 토큰·member-id 가 없다(JWT 문자열 자체도 검사).
    expectNoLeak(seen, page, addressBarUrls, jwt);
  });
});
