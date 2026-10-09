import { expect, test, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { resolveBuildCompareOutputRoot } from '../support/build-compare-output';
import {
  PROTOTYPE_PATH,
  prototypeAvailable,
  prototypeMissingReason,
} from '../support/prototype-path';

const OUTPUT_ROOT = resolveBuildCompareOutputRoot('sprint7-v3/build-compare');
const HARNESS_BUNDLE = '/tmp/sprint7v3-full-offline-harness.js';
const BUILD_DIRECTORY = path.resolve(
  process.cwd(),
  process.env.BUILD_COMPARE_NEXT_DIR ?? '.next',
);
const ORIGIN = 'https://zeroone.local';
const execFileAsync = promisify(execFile);
const screens = [
  'home',
  'search',
  'comm',
  'room',
  'post',
  'write',
  'saved',
  'profile',
  'my',
  'noti',
] as const;
const viewports = [
  { name: 'mobile', width: 390, height: 844, prototype: '390' },
  { name: 'desktop', width: 1440, height: 900, prototype: '1280' },
] as const;

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
});

test.beforeEach(async ({ page }) => setupOfflineOrigin(page));

test.skip(!prototypeAvailable, prototypeMissingReason);

test('production build CSS와 실제 컴포넌트로 10화면을 캡처한다', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const cssFiles = await collectCss(BUILD_DIRECTORY);
  expect(cssFiles.length, 'production build CSS가 있어야 한다').toBeGreaterThan(
    0,
  );
  const css = (
    await Promise.all(cssFiles.map((file) => readFile(file, 'utf8')))
  ).join('\n');
  const manifest: Array<Record<string, unknown>> = [];

  for (const screen of screens) {
    await mkdir(path.join(OUTPUT_ROOT, screen), { recursive: true });
    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(
        `${pathToFileURL(PROTOTYPE_PATH).href}#scr=${screen}&vp=${viewport.prototype}&auth=member&data=ok`,
      );
      await page.evaluate(
        ({ screenId, prototypeViewport }) => {
          const stage = document.querySelector('#stage');
          if (stage) stage.className = `stage vp-${prototypeViewport}`;
          document.querySelectorAll('.screen').forEach((element) => {
            element.classList.toggle('on', element.id === `scr-${screenId}`);
          });
        },
        { screenId: screen, prototypeViewport: viewport.prototype },
      );
      await page.addStyleTag({
        content: '.note,.ctrl,.controls,.topbar{display:none!important}',
      });
      const prototype = page.locator(`#scr-${screen}`);
      await expect(prototype).toBeVisible();
      await prototype.screenshot({
        path: path.join(OUTPUT_ROOT, screen, `proto-${viewport.name}.png`),
        animations: 'disabled',
      });

      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.goto(`${ORIGIN}/?screen=${screen}`);
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ path: HARNESS_BUNDLE });
      await expect(page.locator('#root > *')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1_000);
      await expect(page.getByText('글을 불러오지 못했습니다.')).toHaveCount(0);
      expect(pageErrors, `${screen}/${viewport.name} page errors`).toEqual([]);
      await page.screenshot({
        path: path.join(OUTPUT_ROOT, screen, `impl-${viewport.name}.png`),
        animations: 'disabled',
        fullPage: false,
      });
      manifest.push({
        screen,
        viewport: viewport.name,
        renderMode: 'production-build-css + bundled-real-components',
        pageErrors,
        bodyText: (await page.locator('body').innerText()).slice(0, 800),
      });
    }
  }

  await writeFile(
    path.join(OUTPUT_ROOT, 'capture-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
});
