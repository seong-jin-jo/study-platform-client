import { chromium } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseSha = process.env.BASELINE_SHA;

if (!baseUrl || !baseSha) {
  throw new Error('PLAYWRIGHT_BASE_URL과 BASELINE_SHA가 필요합니다.');
}

const widths = [1024, 1280];
const routes = ['/', '/insights', '/community', '/class'];
const browser = await chromium.launch({ headless: true });
const histograms = {};

const waitForFixtureData = async (page, route) => {
  await page.waitForFunction(() => {
    const error = document.querySelector('[data-testid="route-error"]');
    return !error;
  });

  if (route === '/') {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="home-feed-card"]').length >= 3,
    );
    return;
  }
  if (route === '/insights') {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('button[data-testid^="island-"]').length >=
          3 && document.querySelector('#today-koan-title') !== null,
    );
    return;
  }
  if (route === '/community') {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-testid="community-room-card"]')
          .length >= 3,
    );
    return;
  }
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-testid="mobile-class-card"]').length >=
      3,
  );
};

try {
  for (const width of widths) {
    histograms[String(width)] = {};
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      locale: 'ko-KR',
    });
    const page = await context.newPage();

    for (const route of routes) {
      console.error(`[desktop-baseline] ${width}px ${route}`);
      await page.goto(`${baseUrl}${route}`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForFixtureData(page, route);
      histograms[String(width)][route] = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) throw new Error('main 요소 없음');

        const histogram = {};
        for (const element of main.querySelectorAll('*')) {
          if (element.getClientRects().length === 0) continue;
          const hasDirectText = [...element.childNodes].some(
            (node) =>
              node.nodeType === Node.TEXT_NODE &&
              (node.textContent?.trim().length ?? 0) > 0,
          );
          if (!hasDirectText) continue;
          const size = Number.parseFloat(
            getComputedStyle(element).fontSize,
          ).toFixed(2);
          histogram[size] = (histogram[size] ?? 0) + 1;
        }
        return histogram;
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ baseSha, histograms }, null, 2));
