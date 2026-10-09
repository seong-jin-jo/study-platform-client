import { expect, type Page, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir } from 'node:fs/promises';
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
const HARNESS_BUNDLE = '/tmp/sprint7v3-community-offline-harness.js';
const ORIGIN = 'https://zeroone.local';
const execFileAsync = promisify(execFile);

interface HarnessEvent {
  name: 'claim' | 'join' | 'leave';
  payload?: unknown;
}

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

const renderHarness = async (
  page: Page,
  screen: 'comm' | 'room',
  mode?: 'create' | 'vacant',
) => {
  const params = new URLSearchParams({ screen });
  if (mode) params.set('mode', mode);
  await page.goto(`${ORIGIN}/?${params.toString()}`);

  const cssFiles = await collectCss(path.resolve(process.cwd(), '.next'));
  expect(cssFiles.length, 'Next 빌드 CSS가 있어야 한다').toBeGreaterThan(0);
  const css = (
    await Promise.all(cssFiles.map((file) => readFile(file, 'utf8')))
  ).join('\n');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ path: HARNESS_BUNDLE });
  await expect(
    page.getByTestId(
      screen === 'room' ? 'community-room-detail' : 'community-room-hub',
    ),
  ).toBeVisible();
};

const capturePrototype = async (
  page: Page,
  screen: 'comm' | 'create' | 'join' | 'room',
  viewport: 'desktop' | 'mobile',
) => {
  await page.goto(
    `${pathToFileURL(PROTOTYPE_PATH).href}#scr=${screen}&vp=${viewport === 'mobile' ? '390' : '1280'}&auth=member&data=ok`,
  );
  await expect(page.locator(`#scr-${screen}`)).toBeVisible();
  await page.screenshot({
    path: path.join(OUTPUT_ROOT, screen, `proto-${viewport}.png`),
    fullPage: false,
  });
};

const captureImplementation = async (
  page: Page,
  screen: 'comm' | 'create' | 'join' | 'room',
  viewport: 'desktop' | 'mobile',
) => {
  await renderHarness(
    page,
    screen === 'room' ? 'room' : 'comm',
    screen === 'create' ? 'create' : undefined,
  );
  if (screen === 'join') {
    await page.getByTestId('community-room-join-7').click();
    await expect(page.getByTestId('community-room-swap-list')).toBeVisible();
  }
  if (screen === 'create') {
    await page.getByTestId('community-room-create-trigger').first().click();
    await expect(page.getByRole('dialog')).toContainText('방 만들기');
  }
  await page.screenshot({
    path: path.join(OUTPUT_ROOT, screen, `impl-${viewport}.png`),
    fullPage: false,
  });
};

test.beforeAll(async () => {
  await execFileAsync(
    path.resolve(process.cwd(), 'node_modules/.bin/esbuild'),
    [
      'e2e/support/community-room-offline-harness.tsx',
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
      '--alias:@/api/client/axios=./e2e/support/axios-shim.ts',
      '--alias:@=./src',
    ],
  );
});

test.beforeEach(async ({ page }) => {
  await setupOfflineOrigin(page);
});

test.skip(!prototypeAvailable, prototypeMissingReason);

test('서버 없이 승인 프로토타입과 실제 컴포넌트를 두 뷰포트로 캡처한다', async ({
  page,
}) => {
  for (const screen of ['comm', 'room', 'join', 'create'] as const) {
    await mkdir(path.join(OUTPUT_ROOT, screen), { recursive: true });
    for (const viewport of [
      { name: 'mobile' as const, width: 390, height: 844 },
      { name: 'desktop' as const, width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await capturePrototype(page, screen, viewport.name);
      await captureImplementation(page, screen, viewport.name);
    }
  }
});

test('입장 교체 탈퇴 인수 흐름을 실제 컴포넌트에서 클릭한다', async ({
  page,
}) => {
  await renderHarness(page, 'comm');
  await page.getByTestId('community-room-join-7').click();
  await page
    .getByLabel('지금 뭘 만들고 있나요?')
    .fill('예약 페이지를 만들고 있어요.');
  await page
    .getByLabel('어디서 가장 자주 막히나요?')
    .fill('결제 연동에서 자주 막혀요.');
  await page.getByTestId('community-room-swap-8').click();
  await page.getByTestId('community-room-join-submit').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & {
            __COMMUNITY_ROOM_HARNESS_EVENTS__: HarnessEvent[];
          }
        ).__COMMUNITY_ROOM_HARNESS_EVENTS__.find(
          (event) => event.name === 'join',
        ),
      ),
    )
    .toMatchObject({ name: 'join', payload: { leaveRoomId: 8 } });

  await renderHarness(page, 'room');
  await page.getByTestId('community-room-leave').click();
  await page.getByTestId('community-room-leave-confirm').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & {
            __COMMUNITY_ROOM_HARNESS_EVENTS__: HarnessEvent[];
          }
        ).__COMMUNITY_ROOM_HARNESS_EVENTS__.some(
          (event) => event.name === 'leave',
        ),
      ),
    )
    .toBe(true);

  await renderHarness(page, 'room', 'vacant');
  await page.getByTestId('community-room-claim-ownership').click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & {
            __COMMUNITY_ROOM_HARNESS_EVENTS__: HarnessEvent[];
          }
        ).__COMMUNITY_ROOM_HARNESS_EVENTS__.find(
          (event) => event.name === 'claim',
        ),
      ),
    )
    .toMatchObject({ name: 'claim', payload: { expectedRevision: 9 } });
});
