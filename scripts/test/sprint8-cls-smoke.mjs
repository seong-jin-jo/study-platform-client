#!/usr/bin/env node

import { chromium } from '@playwright/test';

const origin = process.env.SPRINT8_WEB_ORIGIN ?? 'http://127.0.0.1:3210';
const defaultRoutes = [
  '/',
  '/insights',
  '/insights/land/dep',
  '/insights/dep-article-1',
  '/community/801',
  '/community/questions/101',
  '/community/rooms/8',
  '/members/11111111-1111-4111-8111-111111111111',
];
const routes = process.env.SPRINT8_CLS_ROUTE
  ? [process.env.SPRINT8_CLS_ROUTE]
  : defaultRoutes;
const runs = Number(process.env.SPRINT8_CLS_RUNS ?? '1');
const viewports = [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
];

const browser = await chromium.launch();
const results = [];
let failed = false;

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const route of routes) {
    for (let run = 1; run <= runs; run += 1) {
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.addInitScript(() => {
        window.__sprint8Cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__sprint8Cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      const response = await page.goto(`${origin}${route}`, {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(750);
      const cls = await page.evaluate(() => window.__sprint8Cls ?? 0);
      const row = {
        route,
        run,
        viewport: viewport.width,
        status: response?.status() ?? 0,
        cls: Number(cls.toFixed(6)),
        consoleErrors: consoleErrors.length,
        pageErrors: pageErrors.length,
        errorSample: consoleErrors[0] ?? pageErrors[0] ?? '',
      };
      results.push(row);
      if (
        row.status !== 200 ||
        row.cls > 0.1 ||
        row.consoleErrors > 0 ||
        row.pageErrors > 0
      ) {
        failed = true;
      }
      await page.close();
    }
  }
  await context.close();
}

await browser.close();
console.table(results);
if (failed) {
  console.error('FAIL: status, CLS, console or pageerror gate failed');
  process.exitCode = 1;
} else {
  console.log(
    `PASS: ${results.length}/${results.length} route, run and viewport observations, CLS <= 0.1, console/pageerror 0`,
  );
}
