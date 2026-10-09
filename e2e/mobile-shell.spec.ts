import { expect, test } from '@playwright/test';

// 회장 지시(2026-09-25): 390 은 하단 고정 4탭 + 앱형 헤더, 820/1280 은 기존 상단 가로
// 내비를 유지한다. 이 스펙은 회귀 방지용이며 web-mobile-shell-20260925 QA 캡처와 짝이다.
const ROUTES = ['/', '/insights', '/community', '/class', '/login'];
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '820', width: 820, height: 1180 },
  { name: '1280', width: 1280, height: 900 },
];

// 게스트 첫 방문 시 access-token/refresh 가 400 을 내는 것은 의도된 동작이다
// (client-auth-session.ts 17-34: EVER_AUTHENTICATED/CONFIRMED_ANONYMOUS 마커가
// 둘 다 없는 "모름" 상태에서는 refresh 를 1회 프로브한다. 근거:
// docs/discovery/app-release/evidence/public-web-defect-diagnosis-v0.1.0-sol.md §2).
// 콘솔 문자열로 뭉뚱그려 무시하지 않고, 실패 응답의 URL 을 직접 검사해
// 이 경로만 허용하고 그 외 4xx/5xx 는 실패시킨다.
const isAllowedFailure = (url: string) =>
  url.includes('/api/v1/auth/access-token/refresh');

for (const viewport of VIEWPORTS) {
  test.describe(`viewport ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route || 'home'} renders without horizontal overflow`, async ({
        page,
      }) => {
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        const unexpectedFailures: string[] = [];
        page.on('response', (response) => {
          const status = response.status();
          if (status < 400) return;
          const url = response.url();
          if (isAllowedFailure(url)) return;
          unexpectedFailures.push(`${status} ${url}`);
        });

        await page.goto(route, { waitUntil: 'domcontentloaded' });
        // 스트리밍 SSR 로딩 폴백("불러오는 중")이 남아있는 캡처를 방지한다.
        await page
          .getByText('불러오는 중', { exact: false })
          .first()
          .waitFor({ state: 'detached', timeout: 15000 })
          .catch(() => {});
        // Next dev 인디케이터(N 배지)가 탭바를 가리므로 캡처 전 숨긴다.
        await page.addStyleTag({
          content:
            '[data-nextjs-dev-tools-button], #__next-build-watcher, nextjs-portal { display: none !important; }',
        });
        await page.waitForTimeout(500);

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);

        const tabBar = page.getByTestId('mobile-tab-bar');
        if (viewport.width < 768) {
          await expect(tabBar).toBeVisible();

          // 앱형 헤더 회귀 가드: 높이 64px 이하, 로고 좌측 여백 20px 이하
          // (PublicHomeHeader/Header 둘 다 이 규격을 지켜야 한다).
          const headerBox = await page.locator('header').first().boundingBox();
          expect(
            headerBox?.height ?? Number.POSITIVE_INFINITY,
          ).toBeLessThanOrEqual(64);
          const logoBox = await page
            .locator('header img[alt="Logo"]')
            .first()
            .boundingBox();
          expect(logoBox?.x ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
            20,
          );

          // 본문 하단 여백이 탭바 높이만큼 확보돼 있는지 확인한다. 콘텐츠가
          // 짧아 스크롤이 아예 발생하지 않는 화면(로딩·에러 상태 등)에서는
          // "맨 아래로 스크롤 후 마지막 요소 bottom" 비교가 내부 min-h-screen
          // 래퍼를 잘못 집어 거짓 실패를 내므로, 실제 메커니즘인 .pb-tabbar
          // CSS 여백을 computed style로 직접 검증한다.
          const mainPaddingBottom = await page.evaluate(() => {
            const main = document.querySelector('main');
            return main
              ? Number.parseFloat(getComputedStyle(main).paddingBottom)
              : 0;
          });
          expect(mainPaddingBottom).toBeGreaterThanOrEqual(50);
        } else {
          await expect(tabBar).toBeHidden();
        }

        // test-api.zeroone.it.kr 는 localhost 오리진 CORS를 허용하지 않아
        // 홈 피드 위젯의 클라이언트 XHR(공개 피드·커뮤니티 등)이 로컬 검증
        // 환경에서만 차단된다. 앱 코드 결함이 아닌 환경 제약이므로 제외한다.
        // "Failed to load resource" 계열 콘솔 메시지는 URL이 없어 문자열만으로
        // 허용 여부를 판단할 수 없다. 그 판단은 위 response 리스너(URL 기반,
        // access-token/refresh 만 허용)가 이미 정확히 하므로 여기서는 제외하고,
        // 리소스 로드 실패와 무관한 진짜 콘솔 에러만 검사한다.
        const ignorable = (e: string) =>
          e.includes('favicon') ||
          e.includes('CORS policy') ||
          e.includes('net::ERR_FAILED') ||
          e.includes('Failed to load resource');
        expect(consoleErrors.filter((e) => !ignorable(e))).toEqual([]);
        // access-token/refresh 400(의도된 첫 방문 프로브) 외의 4xx/5xx 응답은 없어야 한다.
        expect(unexpectedFailures).toEqual([]);

        const slug = route === '/' ? 'home' : route.replace(/\//g, '');
        await page.screenshot({
          path: test.info().outputPath(`${slug}--${viewport.name}.png`),
          fullPage: false,
        });
      });
    }
  });
}

// 탭 이동·흐름 화면 은닉은 탭바가 실제로 뜨는 390 폭에서만 의미가 있다.
// test.skip 으로 ≥768 을 건너뛰지 않고(격리 게이트가 "승인 안 된 건너뜀"으로
// 반려한다), 애초에 390 전용 describe 에만 둔다. ≥768 에서 탭바가 없다는
// 사실은 위 per-route 루프의 else 분기(toBeHidden)가 이미 전 라우트에서 확인한다.
test.describe('mobile tab bar interactions (390)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('mobile tab navigation updates active state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page
      .getByText('불러오는 중', { exact: false })
      .first()
      .waitFor({ state: 'detached', timeout: 15000 })
      .catch(() => {});
    await page.getByTestId('mobile-tab-insights').click();
    await page.waitForURL('**/insights');
    await expect(page.getByTestId('mobile-tab-insights')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('flow route (/onboarding/retention) hides the tab bar', async ({
    page,
  }) => {
    // /sign-up 은 레거시 라우트라 서버에서 즉시 /class 로 리다이렉트돼
    // 흐름 화면 은닉을 검증할 수 없다(실측: curl -L 결과 / 로 착지).
    // 실제로 렌더되는 흐름 화면인 /onboarding/retention 으로 검증한다.
    await page.goto('/onboarding/retention', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('mobile-tab-bar')).toBeHidden();
  });

  test('Kakao FAB clears the tab bar under iPhone safe-area', async ({
    page,
  }) => {
    // Playwright/Chromium은 실제 노치 기기의 env(safe-area-inset-*)를 재현하지
    // 못한다. global.css :root의 --sat-b/--sat-l/--sat-r는 env(...)의 별칭이라
    // 여기서 document.documentElement에 직접 덮어써 iPhone 홈 인디케이터
    // safe-area(34px)를 흉내 낸다(리뷰 반려 2026-09-26 검증 요구사항).
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page
      .getByText('불러오는 중', { exact: false })
      .first()
      .waitFor({ state: 'detached', timeout: 15000 })
      .catch(() => {});
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--sat-b', '34px');
    });
    // floating-class-action-buttons.tsx의 스크롤 이펙트가 var(--sat-b)를
    // 반영해 el.style.bottom을 다시 계산하도록 리사이즈 이벤트를 한 번 준다.
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(300);

    const tabBar = page.getByTestId('mobile-tab-bar');
    await expect(tabBar).toBeVisible();
    const kakaoFab = page.getByLabel('카카오톡 상담');
    await expect(kakaoFab).toBeVisible();

    const tabBarBox = await tabBar.boundingBox();
    const kakaoBox = await kakaoFab.boundingBox();
    expect(tabBarBox).not.toBeNull();
    expect(kakaoBox).not.toBeNull();
    if (!tabBarBox || !kakaoBox) return;

    // 카카오 버튼의 아래쪽 끝(더 큰 y)이 탭바 상단(더 작은 y)보다 위(또는
    // 같은 줄)여야 겹치지 않는다. 이전엔 `+ 1`로 1px 관용을 뒀는데, 그
    // 관용치가 바로 리뷰가 재반려에서 잡은 1px 겹침(--tabbar-height 도입
    // 전 --spacing-700(56)만 쓴 탓)을 가려서 통과시켰다. 근본 원인을 고쳤으니
    // 관용치 없이 엄격하게 비교한다.
    expect(kakaoBox.y + kakaoBox.height).toBeLessThanOrEqual(tabBarBox.y);
  });
});

// 하단 고정 CTA(랜딩 홈 /home, /class/claude-cowork)가 탭바 아래 깔리지 않는지
// 실제 hit-test로 확인한다. mix-blend-multiply 는 sticky 헤더 컴포지팅과 겹치면
// 스크롤 중 헤더/탭바가 투과되어 비쳐 보이므로, 스크롤 후 헤더 배경이 불투명한지도
// 함께 확인한다(리뷰 반려 MAJOR 1·2, 2026-09-25).
const OVERLAP_ROUTES = ['/home', '/class/claude-cowork'];

test.describe('mobile tab bar hit-test and header opacity (390)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of OVERLAP_ROUTES) {
    test(`${route} sticky CTA does not bury the tab bar`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page
        .getByText('불러오는 중', { exact: false })
        .first()
        .waitFor({ state: 'detached', timeout: 15000 })
        .catch(() => {});
      await page.addStyleTag({
        content:
          '[data-nextjs-dev-tools-button], #__next-build-watcher, nextjs-portal { display: none !important; }',
      });

      const tabBar = page.getByTestId('mobile-tab-bar');
      await expect(tabBar).toBeVisible();
      const tabBarBox = await tabBar.boundingBox();
      expect(tabBarBox).not.toBeNull();
      if (!tabBarBox) return;

      // 탭바 영역 위(좌/중/우) 세 점에서 실제로 최상단에 걸리는 요소가
      // 탭바(또는 그 자식)인지 elementFromPoint로 확인한다.
      const sampleXs = [
        tabBarBox.x + 8,
        tabBarBox.x + tabBarBox.width / 2,
        tabBarBox.x + tabBarBox.width - 8,
      ];
      const sampleY = tabBarBox.y + tabBarBox.height / 2;

      for (const x of sampleXs) {
        const hitsTabBar = await page.evaluate(
          ([px, py]) => {
            const el = document.elementFromPoint(px, py);
            return Boolean(el?.closest('[data-testid="mobile-tab-bar"]'));
          },
          [x, sampleY] as [number, number],
        );
        expect(hitsTabBar).toBe(true);
      }

      // 스크롤 후 헤더가 불투명한지(blend 로 배경이 비쳐 보이지 않는지) 확인.
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(200);
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
      const blendMode = await header.evaluate(
        (el) => getComputedStyle(el).mixBlendMode,
      );
      expect(blendMode).toBe('normal');

      await page.screenshot({
        path: test
          .info()
          .outputPath(`${route.replace(/\//g, '-')}--390-scrolled.png`),
        fullPage: false,
      });
    });
  }
});

// MAJOR 1 회귀 방지 (리뷰 반려 2026-09-26): community-responsive·
// sprint8-responsive·sprint8-flow 로우가 스크롤 끝에서도 탭바 밑에 깔리지
// 않는지, elementFromPoint 로 실제 최상단 요소가 탭바가 아니라 유틸 버튼
// 자신인지 확인한다. /community·/insights/koans 는 (public-seo)/(service-shell)
// 레이아웃. bare /seminar 는 page.tsx가 없어 404이므로(실측: src/app/(service)/
// seminar 밑에 [code]/page.tsx만 존재), route-policy.test.ts가 이미 검증한
// /seminar/sprint7 을 (service) 레이아웃 대표 라우트로 쓴다 — 이 경로도
// route-policy.ts:96의 PUBLIC_SESSION prefix에 걸려 비로그인으로 열린다.
const UTILITY_OVERLAP_ROUTES = [
  '/',
  '/community',
  '/insights/koans',
  '/seminar/sprint7',
];

test.describe('Kakao utility row clears tab bar on scroll (390, elementFromPoint)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of UTILITY_OVERLAP_ROUTES) {
    for (const safeArea of [0, 34]) {
      test(`${route} utility row stays above tab bar (safe-area ${safeArea}px)`, async ({
        page,
      }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page
          .getByText('불러오는 중', { exact: false })
          .first()
          .waitFor({ state: 'detached', timeout: 15000 })
          .catch(() => {});
        await page.addStyleTag({
          content:
            '[data-nextjs-dev-tools-button], #__next-build-watcher, nextjs-portal { display: none !important; }',
        });
        if (safeArea > 0) {
          await page.evaluate((px) => {
            document.documentElement.style.setProperty('--sat-b', `${px}px`);
          }, safeArea);
          await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        }

        const tabBar = page.getByTestId('mobile-tab-bar');
        await expect(tabBar).toBeVisible();
        const kakaoFab = page.getByLabel('카카오톡 상담');
        await expect(kakaoFab).toBeVisible();

        // resolveServiceUtilityLayout(floating-class-action-buttons.tsx:26-43)이
        // 고르는 실제 레이아웃 모드를 data-layout-mode 로 읽는다. 'fixed' 모드
        // (예: '/', '/seminar/*')는 카카오 버튼이 뷰포트 하단에 항상 떠 있으므로
        // 로드 직후(스크롤 전)에도 탭바 바로 위에서 클리어해야 한다 — 이 상태를
        // 카카오가 실제로 "보이는" 대표 상태로 쓴다(독립 리뷰 2026-09-26 재반려
        // 4). community-responsive/sprint8-responsive/sprint8-flow(relative
        // 로우, MAJOR 1 대상)는 로드 직후 로우가 문서 흐름상 페이지 하단(스크롤
        // 안 한 상태에선 화면 밖)에 있어 이 시점 좌표 비교가 성립하지 않는다
        // (실측: /community 카카오 bottom 883 vs 탭바 top 787, 탭바보다 96px
        // 아래로 애초에 뷰포트 밖). 이 모드에서 카카오가 탭바 위에 오는 상태는
        // 오직 "스크롤을 끝까지 내렸을 때"뿐이고, 그건 아래 deep-scroll
        // 블록에서 검증한다.
        const layoutMode = await page
          .getByTestId('service-utility-actions')
          .first()
          .getAttribute('data-layout-mode');
        if (layoutMode === 'fixed') {
          const kakaoBoxBeforeScroll = await kakaoFab.boundingBox();
          const tabBarBoxBeforeScroll = await tabBar.boundingBox();
          expect(kakaoBoxBeforeScroll).not.toBeNull();
          expect(tabBarBoxBeforeScroll).not.toBeNull();
          if (kakaoBoxBeforeScroll && tabBarBoxBeforeScroll) {
            expect(
              kakaoBoxBeforeScroll.y + kakaoBoxBeforeScroll.height,
            ).toBeLessThanOrEqual(tabBarBoxBeforeScroll.y);
            const hitBeforeScroll = await page.evaluate(
              ([px, py]) => {
                const el = document.elementFromPoint(px, py);
                return el?.closest('[aria-label="카카오톡 상담"]')
                  ? 'kakao'
                  : el?.closest('[data-testid="mobile-tab-bar"]')
                    ? 'tab-bar'
                    : 'other';
              },
              [
                kakaoBoxBeforeScroll.x + kakaoBoxBeforeScroll.width / 2,
                kakaoBoxBeforeScroll.y + kakaoBoxBeforeScroll.height / 2,
              ] as [number, number],
            );
            expect(hitBeforeScroll).toBe('kakao');
          }
        }

        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await page.waitForTimeout(300);

        // layoutMode='fixed'(예: '/')는 스크롤이 한 화면 높이(844px)를 넘어가면
        // 카카오 버튼을 의도적으로 숨기고 "맨 위로" 버튼으로 바꾼다
        // (floating-class-action-buttons.tsx:166 `showMobileScrollToTop`,
        // shouldShowMobileScrollToTop = scrollTop >= viewportHeight). 이 CI 실패
        // 재현: 로컬은 게스트 홈 피드가 짧아(scrollHeight 956 < 2×viewport) 이
        // 문턱을 안 넘었지만, CI의 실제 test-api 콘텐츠는 더 길어 문턱을 넘어
        // 카카오가 사라지고 boundingBox()가 null을 반환했다(실측: 로컬에서 body에
        // 2000px 스페이서를 강제로 추가하니 동일하게 재현되고, 이때 "맨 위로"
        // 버튼이 카카오 자리를 정확히 이어받아 탭바 위 772px에서 클리어했다).
        // 그래서 카카오가 아니라 "실제로 보이는 유틸 버튼"(카카오 or 맨 위로)을
        // 찾아 검증한다 — 어느 쪽이 보이든 탭바를 가리면 안 된다는 원래 계약은
        // 그대로 유지하고, 어떤 버튼이 그 계약을 대표하는지만 스크롤 상태에 맞춘다.
        const topButton = page.getByLabel('맨 위로 이동');
        const visibleUtilityButton = (await kakaoFab.isVisible())
          ? kakaoFab
          : topButton;
        await expect(visibleUtilityButton).toBeVisible();

        const utilityBox = await visibleUtilityButton.boundingBox();
        const tabBarBox = await tabBar.boundingBox();
        expect(utilityBox).not.toBeNull();
        expect(tabBarBox).not.toBeNull();
        if (!utilityBox || !tabBarBox) return;

        // 숫자 단언(독립 리뷰 2026-09-26 재반려 3): 중심점 hit-test만으로는
        // 버튼과 탭바가 정확히 1px 겹쳐도 중심점이 버튼 안쪽이라 못 잡는다.
        // 실제로 그 1px 겹침이 있었다(카카오 bottom 788 vs 탭바 top 787).
        // 버튼의 아래쪽 끝이 탭바 위쪽 끝보다 엄격히 위(또는 같은 줄)여야 한다.
        expect(utilityBox.y + utilityBox.height).toBeLessThanOrEqual(
          tabBarBox.y,
        );

        const centerX = utilityBox.x + utilityBox.width / 2;
        const centerY = utilityBox.y + utilityBox.height / 2;
        // 버튼 바로 아래 경계(가장 겹치기 쉬운 지점)에서도 hit-test한다.
        const edgeY = utilityBox.y + utilityBox.height - 1;
        for (const py of [centerY, edgeY]) {
          const topmostIsTabBar = await page.evaluate(
            ([px, y]) => {
              const el = document.elementFromPoint(px, y);
              return Boolean(el?.closest('[data-testid="mobile-tab-bar"]'));
            },
            [centerX, py] as [number, number],
          );
          expect(topmostIsTabBar).toBe(false);

          const topmostIsUtilityRow = await page.evaluate(
            ([px, y]) => {
              const el = document.elementFromPoint(px, y);
              return Boolean(
                el?.closest('[data-testid="service-utility-actions"]'),
              );
            },
            [centerX, py] as [number, number],
          );
          expect(topmostIsUtilityRow).toBe(true);
        }
      });
    }
  }
});

// MINOR 6 (리뷰 반려 2026-09-26): /class/[slug]/payment 는 FLOW_ROUTE_PREFIXES
// 접두어 매칭에 안 걸려 탭바가 뜬 채였다. 결제 흐름 이탈 방지 원칙을
// 슬러그 경로에도 적용했는지 확인한다.
test.describe('class payment flow route hides tab bar (390)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('/class/claude-cowork/payment hides the tab bar', async ({ page }) => {
    await page.goto('/class/claude-cowork/payment', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByTestId('mobile-tab-bar')).toBeHidden();
  });
});
