import { expect, type Request, test } from '@playwright/test';
import sharp from 'sharp';

function readPngDimensions(buffer: Buffer) {
  const pngSignature = '89504e470d0a1a0a';
  expect(buffer.subarray(0, 8).toString('hex')).toBe(pngSignature);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function readMaskablePalette(buffer: Buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let whitePixels = 0;
  let rosePixels = 0;
  let roseMinX = info.width;
  let roseMaxX = -1;
  let roseMinY = info.height;
  let roseMaxY = -1;

  for (let index = 0; index < data.length; index += info.channels) {
    const pixelIndex = index / info.channels;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    const [red, green, blue, alpha] = data.subarray(
      index,
      index + info.channels,
    );

    if (red === 255 && green === 255 && blue === 255 && alpha === 255) {
      whitePixels += 1;
    }
    if (red === 246 && green === 61 && blue === 104 && alpha === 255) {
      rosePixels += 1;
      roseMinX = Math.min(roseMinX, x);
      roseMaxX = Math.max(roseMaxX, x);
      roseMinY = Math.min(roseMinY, y);
      roseMaxY = Math.max(roseMaxY, y);
    }
  }

  return {
    whitePixels,
    rosePixels,
    roseBounds: { roseMinX, roseMaxX, roseMinY, roseMaxY },
  };
}

async function waitForServiceWorkerControl(
  page: import('@playwright/test').Page,
) {
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (
    !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  ) {
    await page.reload({ waitUntil: 'load' });
  }
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
}

test('PWA-E2E-001 manifest와 설치 아이콘 계약이 유효하다', async ({
  page,
  request,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute('href');
  expect(manifestHref).toBe('/manifest.webmanifest');

  const manifestResponse = await request.get(manifestHref ?? '');
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();

  expect(manifest).toMatchObject({
    id: '/',
    name: 'ZERO ONE IT DREAM',
    short_name: 'ZERO ONE',
    description:
      '구글에 없는 질문을 나누는 곳. 0에서 1까지, 개발자가 아닌 사람들의 IT 커뮤니티.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
    lang: 'ko',
  });
  expect(manifest).not.toHaveProperty('orientation');
  expect(manifest.icons).toEqual([
    {
      src: '/icons/pwa-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/pwa-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/pwa-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ]);

  for (const icon of [
    { path: '/icons/pwa-192.png', size: 192 },
    { path: '/icons/pwa-512.png', size: 512 },
    { path: '/icons/pwa-maskable-512.png', size: 512 },
    { path: '/icons/apple-touch-icon.png', size: 180 },
  ]) {
    const response = await request.get(icon.path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
    expect(readPngDimensions(await response.body())).toEqual({
      width: icon.size,
      height: icon.size,
    });
  }

  const maskableResponse = await request.get('/icons/pwa-maskable-512.png');
  const maskablePalette = await readMaskablePalette(
    await maskableResponse.body(),
  );
  expect(maskablePalette.whitePixels).toBeGreaterThan(
    maskablePalette.rosePixels,
  );
  expect(maskablePalette.rosePixels).toBeGreaterThan(0);
  expect(maskablePalette.roseBounds).toMatchObject({
    roseMinX: expect.any(Number),
    roseMaxX: expect.any(Number),
    roseMinY: expect.any(Number),
    roseMaxY: expect.any(Number),
  });
  expect(maskablePalette.roseBounds.roseMinX).toBeGreaterThanOrEqual(51);
  expect(maskablePalette.roseBounds.roseMaxX).toBeLessThanOrEqual(460);
  expect(maskablePalette.roseBounds.roseMinY).toBeGreaterThanOrEqual(51);
  expect(maskablePalette.roseBounds.roseMaxY).toBeLessThanOrEqual(460);
});

test('PWA-E2E-002 viewport와 theme-color 메타가 각각 하나다', async ({
  page,
}) => {
  for (const path of ['/', '/login', '/community', '/insights']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('meta[name="viewport"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /viewport-fit=cover/,
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#FFFFFF',
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/icons/apple-touch-icon.png',
    );
    await expect(
      page.locator('meta[name="mobile-web-app-capable"]'),
    ).toHaveAttribute('content', 'yes');
    await expect(
      page.locator('meta[name="apple-mobile-web-app-title"]'),
    ).toHaveAttribute('content', 'ZERO ONE IT DREAM');
    await expect(
      page.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
    ).toHaveAttribute('content', 'default');
  }
});

test('PWA-E2E-003 production 서비스워커가 오프라인 내비게이션을 복구한다', async ({
  context,
  page,
}) => {
  const failedStaticFonts: string[] = [];
  const recordFailedStaticFont = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (
      path.startsWith('/_next/static/') &&
      /\.(?:woff2?|otf|ttf)$/.test(path)
    ) {
      failedStaticFonts.push(path);
    }
  };
  page.on('requestfailed', recordFailedStaticFont);
  await waitForServiceWorkerControl(page);

  const warmedStaticPath = await page.evaluate(async () => {
    const staticUrl = Array.from(document.scripts)
      .map((script) => script.src)
      .find((src) => new URL(src).pathname.startsWith('/_next/static/'));
    if (!staticUrl) {
      throw new Error(
        '서비스워커 정적 캐시를 검증할 Next 정적 자원이 없습니다.',
      );
    }
    const response = await fetch(staticUrl, { cache: 'reload' });
    if (!response.ok) {
      throw new Error(`Next 정적 자원 요청 실패: ${response.status}`);
    }
    return new URL(response.url).pathname;
  });

  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    const navigationPreloadState = await ready.navigationPreload.getState();
    const cacheKeys = await caches.keys();
    const staticCacheName = cacheKeys.find((key) => key.endsWith('-static'));
    const staticCacheEntries = staticCacheName
      ? (await (await caches.open(staticCacheName)).keys()).map(
          (request) => new URL(request.url).pathname,
        )
      : [];
    return {
      scope: ready.scope,
      scriptURL: ready.active?.scriptURL,
      navigationPreloadEnabled: navigationPreloadState.enabled,
      cacheKeys,
      staticCacheEntries,
    };
  });
  expect(registration.scope).toMatch(/\/$/);
  expect(registration.scriptURL).toMatch(/\/sw\.js\?v=[a-zA-Z0-9._-]+$/);
  expect(registration.navigationPreloadEnabled).toBe(true);
  const cacheVersion = new URL(registration.scriptURL ?? '').searchParams.get(
    'v',
  );
  expect(registration.cacheKeys).toEqual(
    expect.arrayContaining([
      `zeroone-pwa-${cacheVersion}-offline`,
      `zeroone-pwa-${cacheVersion}-static`,
    ]),
  );
  expect(
    registration.cacheKeys.filter((key) => key.startsWith('zeroone-pwa-')),
  ).toHaveLength(2);
  expect(registration.staticCacheEntries).toContain(warmedStaticPath);

  await context.setOffline(true);
  try {
    await page.goto('/community?pwa-offline=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: '지금은 오프라인이에요' }),
    ).toBeVisible();
    await expect(page.getByText('인터넷 연결을 확인한 뒤')).toBeVisible();
    await expect(
      page.locator('main svg[aria-label="ZERO ONE IT"]'),
    ).toBeVisible();
    await expect(page.locator('main img')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(failedStaticFonts).toEqual([]);
  } finally {
    await context.setOffline(false);
    page.off('requestfailed', recordFailedStaticFont);
  }
});

test('PWA-E2E-015 정적 캐시가 비어도 오프라인 카드는 자급 레이아웃을 유지한다', async ({
  context,
  page,
}) => {
  await waitForServiceWorkerControl(page);

  const emptiedStaticCache = await page.evaluate(async () => {
    const staticCacheName = (await caches.keys()).find((key) =>
      key.endsWith('-static'),
    );
    if (!staticCacheName) return null;

    await caches.delete(staticCacheName);
    await caches.open(staticCacheName);
    return staticCacheName;
  });
  if (emptiedStaticCache === null) {
    throw new Error('정적 캐시를 찾지 못했습니다.');
  }

  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCache');

  const staticCacheEntryCount = await page.evaluate(async (cacheName) => {
    const staticCache = await caches.open(cacheName);
    return (await staticCache.keys()).length;
  }, emptiedStaticCache);
  expect(staticCacheEntryCount).toBe(0);

  await context.setOffline(true);
  try {
    for (const width of [390, 820]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(
        `/community?pwa-empty-static-cache=${width}`,
        { waitUntil: 'domcontentloaded' },
      );

      expect(response?.fromServiceWorker()).toBe(true);
      const heading = page.getByRole('heading', {
        name: '지금은 오프라인이에요',
      });
      await expect(heading).toBeVisible();
      await expect(page.locator('script')).toHaveCount(0);
      await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);

      const metrics = await page.evaluate(() => {
        const card = document.querySelector('main > section');
        const title = document.querySelector('h1');
        const retry = document.querySelector('a[href="/"]');
        if (
          !(card instanceof HTMLElement) ||
          !(title instanceof HTMLElement) ||
          !(retry instanceof HTMLElement)
        ) {
          throw new Error('오프라인 자급 레이아웃 요소를 찾지 못했습니다.');
        }

        const cardBox = card.getBoundingClientRect();
        const titleBox = title.getBoundingClientRect();
        const retryBox = retry.getBoundingClientRect();
        const hit = document.elementFromPoint(
          retryBox.x + retryBox.width / 2,
          retryBox.y + retryBox.height / 2,
        );

        return {
          cardWidth: cardBox.width,
          titleHeight: titleBox.height,
          titleLineHeight: Number.parseFloat(
            getComputedStyle(title).lineHeight,
          ),
          retryIsTopmost: hit === retry || retry.contains(hit),
        };
      });

      expect(metrics.cardWidth).toBeGreaterThanOrEqual(300);
      expect(metrics.cardWidth).toBeLessThanOrEqual(400);
      expect(metrics.titleHeight).toBeLessThanOrEqual(
        metrics.titleLineHeight * 2 + 1,
      );
      expect(metrics.retryIsTopmost).toBe(true);

      const screenshotDirectory = process.env.PWA_OFFLINE_SCREENSHOT_DIRECTORY;
      if (screenshotDirectory) {
        await page.screenshot({
          path: `${screenshotDirectory}/local-offline-static-${width}.png`,
          fullPage: true,
        });
      }
    }
  } finally {
    await context.setOffline(false);
  }
});

test('PWA-E2E-016 따뜻한 캐시에서도 정적 오프라인 문서를 반복 렌더한다', async ({
  context,
  page,
}) => {
  const pageErrors: string[] = [];
  const chunkLoadConsoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /ChunkLoadError|Loading chunk .* failed/i.test(message.text())
    ) {
      chunkLoadConsoleErrors.push(message.text());
    }
  });

  await waitForServiceWorkerControl(page);
  for (const path of ['/community', '/insights', '/class']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
  }
  await page.setViewportSize({ width: 390, height: 900 });

  await context.setOffline(true);
  try {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await page.goto(
        `/community?pwa-warm-cache-attempt=${attempt}`,
        { waitUntil: 'domcontentloaded' },
      );

      expect(response?.fromServiceWorker()).toBe(true);
      await expect(
        page.getByRole('heading', { name: '지금은 오프라인이에요' }),
      ).toBeVisible();
      await expect(page.locator('script')).toHaveCount(0);
      const cardWidth = await page
        .locator('main > section')
        .evaluate((element) => element.getBoundingClientRect().width);
      expect(cardWidth).toBeGreaterThanOrEqual(300);
    }
  } finally {
    await context.setOffline(false);
  }

  expect(pageErrors).toEqual([]);
  expect(chunkLoadConsoleErrors).toEqual([]);
});

test('PWA-E2E-012 767px에서는 설치 이벤트를 보관하고 메뉴에 노출한다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 767, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute(
    'data-pwa-display-mode',
    'browser',
  );

  const defaultPrevented = await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: async () => undefined,
      userChoice: Promise.resolve({
        outcome: 'dismissed',
        platform: 'web',
      }),
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });

  expect(defaultPrevented).toBe(true);
  await page.getByLabel('메뉴 열기').click();
  await expect(page.getByTestId('pwa-install-button')).toBeVisible();
});

test('PWA-E2E-004 Chromium installability와 manifest 파싱 오류가 없다', async ({
  context,
  page,
}) => {
  await waitForServiceWorkerControl(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Page.enable');

  const manifest = await cdp.send('Page.getAppManifest');
  expect(manifest.errors).toEqual([]);
  expect(manifest.url).toMatch(/\/manifest\.webmanifest$/);

  const installability = await cdp.send('Page.getInstallabilityErrors');
  expect(installability.installabilityErrors).toEqual([]);
});

test('PWA-E2E-011 서비스워커 제어 중 폐기 경로를 다운로드 없이 HTML 404로 렌더한다', async ({
  page,
}) => {
  await waitForServiceWorkerControl(page);
  let downloadCount = 0;
  const countDownload = () => {
    downloadCount += 1;
  };
  page.on('download', countDownload);

  const response = await page.goto('/group-study', {
    waitUntil: 'domcontentloaded',
  });

  expect(response?.fromServiceWorker()).toBe(true);
  expect(response?.status()).toBe(404);
  expect(response?.headers()['content-type']).toContain(
    'text/html; charset=utf-8',
  );
  await expect(
    page.getByRole('heading', {
      name: '요청한 페이지를 찾을 수 없습니다.',
    }),
  ).toBeVisible();
  await page.waitForTimeout(100);
  expect(downloadCount).toBe(0);
  page.off('download', countDownload);
});

test('PWA-E2E-013 서비스워커 제어 중 온라인 리다이렉트를 오프라인으로 바꾸지 않는다', async ({
  page,
}) => {
  await waitForServiceWorkerControl(page);

  const redirectCases = [
    { from: '/my-class', to: '/' },
    { from: '/insights/weekly', to: '/insights' },
    { from: '/mypage', to: '/' },
    { from: '/admin', to: '/' },
  ];

  for (const redirectCase of redirectCases) {
    await page.goto(redirectCase.from, { waitUntil: 'domcontentloaded' });

    expect(new URL(page.url()).pathname).toBe(redirectCase.to);
    await expect(
      page.getByRole('heading', { name: '지금은 오프라인이에요' }),
    ).toHaveCount(0);
  }
});

test.describe('모바일 설치 안내', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('PWA-E2E-005 beforeinstallprompt가 온 뒤 메뉴에서 설치를 호출한다', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('메뉴 닫기')).toBeAttached();
    const defaultPrevented = await page.evaluate(() => {
      Object.assign(window, { __pwaPromptCalls: 0 });
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: async () => {
          const target = window as unknown as Window & {
            __pwaPromptCalls: number;
          };
          target.__pwaPromptCalls += 1;
        },
        userChoice: Promise.resolve({
          outcome: 'accepted',
          platform: 'web',
        }),
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(defaultPrevented).toBe(true);

    await page.getByLabel('메뉴 열기').click();
    const installButton = page.getByTestId('pwa-install-button');
    await expect(installButton).toBeVisible();
    await installButton.click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as Window & { __pwaPromptCalls: number })
              .__pwaPromptCalls,
        ),
      )
      .toBe(1);
  });

  test('PWA-E2E-014 설치 프롬프트가 실패해도 오류를 격리하고 버튼을 정리한다', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('메뉴 닫기')).toBeAttached();
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const defaultPrevented = await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: () => Promise.reject(new Error('synthetic prompt failure')),
        userChoice: Promise.resolve({
          outcome: 'dismissed',
          platform: 'web',
        }),
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(defaultPrevented).toBe(true);

    await page.getByLabel('메뉴 열기').click();
    const installButton = page.getByTestId('pwa-install-button');
    await expect(installButton).toBeVisible();
    await installButton.click();
    await expect(installButton).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('PWA-E2E-006 standalone에서는 실제 env() safe-area 아래에 헤더와 드로어를 둔다', async ({
    context,
    page,
  }) => {
    await page.addInitScript(() => {
      const nativeMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (query !== '(display-mode: standalone)') {
          return nativeMatchMedia(query);
        }
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => true,
        };
      };
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', {
      insets: { top: 47, right: 0, bottom: 34, left: 0 },
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute(
      'data-pwa-display-mode',
      'standalone',
    );
    const header = page.locator('header').first();
    await expect(header).toHaveCSS('padding-top', '47px');
    const headerBox = await header.boundingBox();
    expect(headerBox?.height).toBeGreaterThanOrEqual(103);
    const openButtonBox = await page.getByLabel('메뉴 열기').boundingBox();
    expect(openButtonBox?.y).toBeGreaterThanOrEqual(47);
    await page.getByLabel('메뉴 열기').click();
    const drawer = page.locator('.app-shell-drawer');
    await expect(drawer).toHaveCSS('padding-top', '47px');
    const closeButtonBox = await page.getByLabel('메뉴 닫기').boundingBox();
    expect(closeButtonBox?.y).toBeGreaterThanOrEqual(47);
    await expect(page.getByTestId('pwa-install-button')).toHaveCount(0);
    await expect(page.getByTestId('pwa-install-ios')).toHaveCount(0);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: {} });
  });

  test('PWA-E2E-007 iOS Safari에서는 홈 화면 추가 안내를 보여준다', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperties(navigator, {
        userAgent: {
          configurable: true,
          value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        },
        vendor: { configurable: true, value: 'Apple Computer, Inc.' },
        maxTouchPoints: { configurable: true, value: 5 },
      });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('메뉴 열기').click();

    const guide = page.getByTestId('pwa-install-ios');
    await expect(guide).toBeVisible();
    await expect(guide).toContainText('Safari 공유 버튼');
    await expect(page.getByTestId('pwa-install-button')).toHaveCount(0);
  });

  test('PWA-E2E-009 하이드레이션 전 설치 이벤트도 메뉴 버튼으로 복원한다', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          Object.assign(window, { __pwaPromptCalls: 0 });
          const event = new Event('beforeinstallprompt', { cancelable: true });
          Object.assign(event, {
            prompt: async () => {
              const target = window as unknown as Window & {
                __pwaPromptCalls: number;
              };
              target.__pwaPromptCalls += 1;
            },
            userChoice: Promise.resolve({
              outcome: 'accepted',
              platform: 'web',
            }),
          });
          window.dispatchEvent(event);
        },
        { once: true },
      );
    });

    await page.goto('/', { waitUntil: 'load' });
    await page.getByLabel('메뉴 열기').click();
    await expect(page.getByTestId('pwa-install-button')).toBeVisible();
  });

  test('PWA-E2E-010 설치 이벤트 뒤 /class 이동에도 설치 버튼을 유지한다', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute(
      'data-pwa-display-mode',
      'browser',
    );
    await expect(page.getByLabel('메뉴 열기')).toBeAttached();
    const defaultPrevented = await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: async () => undefined,
        userChoice: Promise.resolve({
          outcome: 'dismissed',
          platform: 'web',
        }),
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(defaultPrevented).toBe(true);

    await page.getByTestId('mobile-tab-classes').click();
    await expect(page).toHaveURL(/\/class(?:\?|$)/);
    await page.getByLabel('메뉴 열기').click();
    await expect(page.getByTestId('pwa-install-button')).toBeVisible();
  });
});

for (const width of [768, 820, 1280]) {
  test(`PWA-E2E-008 ${width}px에서는 설치 UI를 만들지 않는다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('메뉴 닫기')).toBeAttached();
    const defaultPrevented = await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: async () => undefined,
        userChoice: Promise.resolve({
          outcome: 'dismissed',
          platform: 'web',
        }),
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(defaultPrevented).toBe(false);
    await expect(page.getByTestId('pwa-install-button')).toHaveCount(0);
    await expect(page.getByTestId('pwa-install-ios')).toHaveCount(0);
  });
}
