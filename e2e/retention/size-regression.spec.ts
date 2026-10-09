import { expect, type Page, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const ORIGIN = 'https://zeroone.local';
const HARNESS_BUNDLE = '/tmp/sprint7v3-size-regression-harness.js';
const BUILD_DIRECTORY = path.resolve(
  process.cwd(),
  process.env.SIZE_REGRESSION_NEXT_DIR ?? '.next',
);
const execFileAsync = promisify(execFile);

const VIEWPORTS = [
  { label: '390px', width: 390, height: 844 },
  { label: '1024px', width: 1024, height: 768 },
  { label: '1920px', width: 1920, height: 1080 },
] as const;

const SCREEN_SOURCES = {
  home: 'src/components/retention/home-feed.tsx',
  search: 'src/components/retention/home-feed.tsx',
  comm: 'src/components/community/pages/community-room-hub-page.tsx',
  room: 'src/components/community/pages/community-room-detail-page.tsx',
  post: 'src/features/community/ui/pages/community-detail-page-client.tsx',
  write: 'src/features/community/ui/pages/community-write-page-client.tsx',
  saved: 'src/components/saved-resource/pages/saved-resources-page.tsx',
  profile: 'src/components/community/public-profile-content.tsx',
  my: 'src/app/(service)/(my)/my-page/page-client.tsx',
  noti: 'src/app/(service)/(my)/notification/page-client.tsx',
} as const;

type Screen = keyof typeof SCREEN_SOURCES;

interface SvgMeasurement {
  className: string;
  height: number;
  label: string;
  width: number;
}

let productionCss = '';

const collectCss = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectCss(target);
      return entry.name.endsWith('.css') ? [target] : [];
    }),
  );
  return nested.flat();
};

const setupOfflineOrigin = async (page: Page) => {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname)) {
      const assetPath = path.resolve(
        process.cwd(),
        'public',
        `.${url.pathname}`,
      );
      try {
        return route.fulfill({ body: await readFile(assetPath) });
      } catch {
        return route.fulfill({ status: 404, body: '' });
      }
    }
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>',
    });
  });
};

const renderScreen = async (page: Page, screen: Screen) => {
  await page.goto(`${ORIGIN}/?screen=${screen}`);
  await page.addStyleTag({ content: productionCss });
  await page.addScriptTag({ path: HARNESS_BUNDLE });
  await expect(page.locator('#root > *')).toBeVisible({ timeout: 15_000 });
  await expect(
    page.locator('#root svg:visible').first(),
    `${screen} 화면은 SVG 크기 회귀를 측정할 실제 렌더 아이콘이 있어야 합니다: ${SCREEN_SOURCES[screen]}`,
  ).toBeVisible({ timeout: 15_000 });
};

const assertAllRenderedSvgIconsInRange = async ({
  page,
  screen,
}: {
  page: Page;
  screen: Screen;
}) => {
  const measurements = await page.locator('#root svg').evaluateAll((svgs) =>
    svgs.flatMap((svg) => {
      const rect = svg.getBoundingClientRect();
      const style = getComputedStyle(svg);
      const className = svg.getAttribute('class') ?? '';
      const isRendered =
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden';
      if (!isRendered) return [];

      return [
        {
          className,
          height: rect.height,
          label:
            svg.getAttribute('aria-label') ??
            svg.querySelector('title')?.textContent ??
            svg.parentElement?.textContent?.trim().slice(0, 80) ??
            '(label 없음)',
          width: rect.width,
        },
      ];
    }),
  );
  const offenders = measurements.filter(
    ({ height, width }) =>
      width < 12 || width > 32 || height < 12 || height > 32,
  );

  process.stdout.write(
    `SIZE_EVIDENCE ${JSON.stringify({ measurements, screen, source: SCREEN_SOURCES[screen] })}\n`,
  );
  expect(
    measurements.length,
    `${screen} 화면에서 실제 렌더된 SVG를 하나도 측정하지 못했습니다: ${SCREEN_SOURCES[screen]}`,
  ).toBeGreaterThan(0);
  expect(
    offenders,
    `${screen} 화면 SVG 크기 범위 위반, 기대 12~32px: ${SCREEN_SOURCES[screen]}`,
  ).toEqual([]);

  return measurements as SvgMeasurement[];
};

test.beforeAll(async () => {
  await execFileAsync(
    path.resolve(process.cwd(), 'node_modules/.bin/esbuild'),
    [
      'e2e/support/sprint7v3-full-offline-harness.tsx',
      '--bundle',
      '--platform=browser',
      '--format=iife',
      `--outfile=${HARNESS_BUNDLE}`,
      '--define:process.env={}',
      '--define:process.platform="browser"',
      '--alias:next/image=./e2e/support/next-image-shim.ts',
      '--alias:next/link=./e2e/support/next-link-shim.ts',
      '--alias:next/navigation=./e2e/support/next-navigation-shim.ts',
      '--alias:next/dynamic=./e2e/support/next-dynamic-shim.ts',
      '--alias:@sentry/nextjs=./e2e/support/sentry-shim.ts',
      '--alias:public/images/notification.svg=./e2e/support/notification-icon-shim.tsx',
      '--alias:public/icons/keyboard-arrow-left.svg=./e2e/support/svg-icon-shim.tsx',
      '--alias:public/icons/keyboard-arrow-right.svg=./e2e/support/svg-icon-shim.tsx',
      '--alias:public/icons/more.svg=./e2e/support/svg-icon-shim.tsx',
      '--alias:public/icons/modal-close.svg=./e2e/support/svg-icon-shim.tsx',
      '--alias:@=./src',
    ],
  );

  const cssFiles = await collectCss(BUILD_DIRECTORY);
  expect(
    cssFiles.length,
    'production build CSS가 있어야 합니다.',
  ).toBeGreaterThan(0);
  productionCss = (
    await Promise.all(cssFiles.map((file) => readFile(file, 'utf8')))
  ).join('\n');
});

test.beforeEach(async ({ page }) => setupOfflineOrigin(page));

test.describe('Sprint 7 V3 SVG 아이콘 계산 크기 회귀', () => {
  for (const viewport of VIEWPORTS) {
    for (const screen of Object.keys(SCREEN_SOURCES) as Screen[]) {
      test(`[${viewport.label}] ${screen} SVG 12~32px`, async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await renderScreen(page, screen);
        await assertAllRenderedSvgIconsInRange({ page, screen });
      });
    }
  }
});

// SKILLS_USED: 없음
// SKILLS_SKIPPED: 현재 세션의 가용 스킬 중 Playwright QA E2E에 매칭되는 스킬 없음
// SOURCES: https://playwright.dev/docs/api/class-locator | https://playwright.dev/docs/locators | https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect | e2e/support/sprint7v3-full-offline-harness.tsx
// MODEL: gpt-codex/gpt-5.6-sol
