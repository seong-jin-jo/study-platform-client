#!/usr/bin/env node

import { chromium } from '@playwright/test';

const origin = process.env.SPRINT8_WEB_ORIGIN ?? 'http://127.0.0.1:3210';
const routes = (
  process.env.SPRINT8_CLS_ROUTES ??
  '/community/questions/101,/community/rooms/8'
)
  .split(',')
  .filter(Boolean);
const viewports = [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
];

const browser = await chromium.launch();

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const route of routes) {
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__sprint8ClsSources = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          window.__sprint8ClsSources.push({
            value: entry.value,
            startTime: entry.startTime,
            sources: (entry.sources ?? []).map((source) => {
              const node = source.node;
              let selector = '';
              if (node instanceof Element) {
                selector = node.id ? `#${node.id}` : node.tagName.toLowerCase();
                if (node.classList.length > 0) {
                  selector += `.${[...node.classList].join('.')}`;
                }
                selector += ` text=${JSON.stringify((node.textContent ?? '').trim().slice(0, 80))}`;
              }
              return {
                selector,
                previousRect: source.previousRect,
                currentRect: source.currentRect,
              };
            }),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const response = await page.goto(`${origin}${route}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1000);
    const shifts = await page.evaluate(() => window.__sprint8ClsSources ?? []);
    console.log(
      JSON.stringify(
        { route, viewport, status: response?.status() ?? 0, shifts },
        null,
        2,
      ),
    );
    await page.close();
  }
  await context.close();
}

await browser.close();
