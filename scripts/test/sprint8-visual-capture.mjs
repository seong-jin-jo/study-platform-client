import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const outputDir =
  process.env.SPRINT8_VISUAL_DIR ?? 'test-results/sprint8-visual';
const prototypeBase =
  process.env.SPRINT8_PROTOTYPE_BASE ?? 'http://127.0.0.1:3213';
const appBase = process.env.SPRINT8_APP_BASE ?? 'http://127.0.0.1:3210';
const showcaseUrl = `${prototypeBase}/sprint8-integration-F-sea-stage-v9-opus5.html`;
const screens = [
  {
    name: 'hub',
    prototypeUrl: showcaseUrl,
    prototypeRoute: '#/sea',
    appUrl: `${appBase}/insights`,
    ready: '[data-testid="insight-worldmap"]',
  },
  {
    name: 'island',
    prototypeUrl: showcaseUrl,
    prototypeRoute: '#/land/dep',
    appUrl: `${appBase}/insights/land/dep`,
    ready: '[data-testid="island-detail"]',
  },
  {
    name: 'koan-list',
    prototypeUrl: `${prototypeBase}/sprint8-koan-list-v2-opus5.html`,
    appUrl: `${appBase}/insights/koans`,
    ready: '[data-testid="koan-list"]',
    hidePrototypeControls: true,
  },
  {
    name: 'koan-detail',
    prototypeUrl: `${prototypeBase}/sprint8-koan-detail-v3-opus5.html`,
    appUrl: `${appBase}/insights/koans/1`,
    ready: '[data-testid="koan-detail"]',
    hidePrototypeControls: true,
  },
];
const viewports = [
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'mobile-390', width: 390, height: 844 },
];
const fixtureMemberToken = [
  Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
    'base64url',
  ),
  Buffer.from(
    JSON.stringify({
      roleIds: ['ROLE_MEMBER'],
      authVendor: 'TEST',
      memberId: 1,
      sub: 'sprint8-visual-member',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url'),
  'fixture',
].join('.');

async function capturePrototype(browser, screen, viewport) {
  // The sea-stage document is a showcase shell. Its viewport switch controls
  // the real app iframe, so page-level screenshots include irrelevant controls.
  if (screen.prototypeRoute) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(screen.prototypeUrl, { waitUntil: 'networkidle' });
    await page.locator(`[data-go="${screen.prototypeRoute}"]`).click();
    await page
      .locator(`[data-vw="${viewport.width === 390 ? '390' : '1024'}"]`)
      .click();
    await page.waitForFunction(
      (route) =>
        document.querySelector('#app')?.contentWindow?.location.hash === route,
      screen.prototypeRoute,
    );
    await page.waitForFunction(
      () =>
        document.querySelector('#app')?.contentDocument?.readyState ===
          'complete' &&
        document.querySelector('#app')?.contentDocument?.fonts?.status ===
          'loaded',
    );
    await page.locator('#app').evaluate((iframe, height) => {
      iframe.style.height = `${height}px`;
      iframe.style.minHeight = `${height}px`;
    }, viewport.height);
    await page.evaluate(() => document.fonts.ready);

    const frame = page.locator('#frame');
    const frameBox = await frame.boundingBox();
    const expectedWidth = viewport.width === 390 ? 390 : 1024;
    if (!frameBox || Math.round(frameBox.width) !== expectedWidth) {
      throw new Error(
        `${screen.name} prototype frame: expected ${expectedWidth}px, got ${frameBox?.width ?? 'missing'}px`,
      );
    }
    await frame.screenshot({
      animations: 'disabled',
      path: `${outputDir}/${screen.name}-prototype-${viewport.name}.png`,
    });
    await context.close();
    return;
  }

  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(screen.prototypeUrl, { waitUntil: 'networkidle' });
  if (screen.hidePrototypeControls) {
    await page.addStyleTag({
      content: '.demobar { display: none !important; }',
    });
  }
  await page.evaluate(() => document.fonts.ready);
  const actualWidth = await page.evaluate(() => window.innerWidth);
  if (actualWidth !== viewport.width) {
    throw new Error(
      `${screen.name} prototype: expected ${viewport.width}px, got ${actualWidth}px`,
    );
  }
  await page.screenshot({
    animations: 'disabled',
    path: `${outputDir}/${screen.name}-prototype-${viewport.name}.png`,
    fullPage: false,
  });
  await context.close();
}

async function captureImplementation(browser, screen, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  await context.addCookies([
    { name: 'accessToken', value: fixtureMemberToken, url: appBase },
  ]);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width === 390,
  });
  await page.goto(screen.appUrl, { waitUntil: 'networkidle' });
  await page.locator(screen.ready).waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  const actualWidth = await page.evaluate(() => window.innerWidth);
  if (actualWidth !== viewport.width) {
    throw new Error(
      `${screen.name} implementation: expected ${viewport.width}px, got ${actualWidth}px`,
    );
  }
  await page.screenshot({
    animations: 'disabled',
    path: `${outputDir}/${screen.name}-implementation-${viewport.name}.png`,
    fullPage: false,
  });
  await context.close();
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const viewport of viewports) {
  for (const screen of screens) {
    await capturePrototype(browser, screen, viewport);
    await captureImplementation(browser, screen, viewport);
  }
}
await browser.close();
