/** 담당 테스트 케이스: S7-CAPTURE-01, TC-H7-1, TC-H9-1, TC-C12-1, TC-M1-1, TC-M6a-1 */

// biome-ignore assist/source/organizeImports: repository ESLint import/order is authoritative.
import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { resolveBuildCompareOutputRoot } from '../support/build-compare-output';

import {
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

const WEB_BASE_URL = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

test.use({ storageState: { cookies: [], origins: [] } });
const SEARCH_QUERY = process.env.E2E_SPRINT7_SEARCH_QUERY ?? '배포';

interface ApiEnvelope<T> {
  content: T;
}

type JsonRecord = Record<string, unknown>;

function requiredMemberId(): number {
  const value = Number(process.env.E2E_SPRINT7_MEMBER_ID?.trim());
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      'E2E_SPRINT7_MEMBER_ID is required and must be a positive integer',
    );
  }
  return value;
}

async function mintMemberToken(
  request: APIRequestContext,
  memberId = requiredMemberId(),
): Promise<string> {
  const configured = process.env.E2E_SPRINT7_MEMBER_TOKEN?.trim();
  if (configured && memberId === requiredMemberId()) return configured;

  const response = await request.get(
    `${API_BASE_URL}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
  );
  expect(response.status(), `QA token mint failed for member ${memberId}`).toBe(
    200,
  );
  const body = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
  expect(body.content.accessToken).toBeTruthy();
  return body.content.accessToken;
}

async function authenticatePage(
  page: Page,
  request: APIRequestContext,
): Promise<string> {
  const token = await mintMemberToken(request);
  const target = new URL(WEB_BASE_URL);
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: token,
      domain: target.hostname,
      path: '/',
      httpOnly: false,
      secure: target.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);
  return token;
}

async function dismissOnboardingModalIfPresent(page: Page): Promise<void> {
  const modalCopy = page.getByText('ZERO-ONE에서 사용할 이름입니다.').first();
  await modalCopy.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  if (!(await modalCopy.isVisible())) return;
  const onboardingModal = page
    .locator('div.fixed.inset-0.z-50')
    .filter({ has: modalCopy });
  await onboardingModal
    .getByRole('button', { name: '닫기', exact: true })
    .click();
  await modalCopy.waitFor({ state: 'hidden' });
}

function unwrapContent(value: unknown): JsonRecord {
  expect(value).toBeTruthy();
  expect(typeof value).toBe('object');
  const envelope = value as JsonRecord;
  const content = envelope.content;
  expect(content).toBeTruthy();
  expect(typeof content).toBe('object');
  return content as JsonRecord;
}

function itemsOf(content: JsonRecord): JsonRecord[] {
  const items = content.items;
  expect(Array.isArray(items)).toBe(true);
  return items as JsonRecord[];
}

async function discoverPublicProfileUuid(
  request: APIRequestContext,
): Promise<string> {
  const response = await request.get(
    `${API_BASE_URL}/api/v1/members/public-profile-sitemap-resources`,
    { params: { size: 50 } },
  );
  expect(response.status()).toBe(200);
  const items = itemsOf(unwrapContent(await response.json()));
  const profile = items.find(
    (item) => typeof item.publicProfileUuid === 'string',
  );
  expect(profile, 'no indexable public profile seed found').toBeTruthy();
  return String(profile?.publicProfileUuid);
}

// 저장 위치는 공용 헬퍼가 정한다. CI 는 study-platform-client 하나만
// 컨테이너에 마운트하므로 저장소 루트의 docs/ 는 존재하지 않는다.
// 앞서 파일 위치 기준으로 바꿔봤지만 같은 이유로 못 쓴다.
const outputRoot = resolveBuildCompareOutputRoot('dev-authenticated');

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

async function assertAuthenticatedScreen(page: Page, screen: string) {
  await expect(page).not.toHaveURL(/\/(login|sign-up|redirection)(?:\?|$)/);
  const authenticationErrorSurface = page
    .locator(
      '[role="alert"], [aria-live="assertive"], [data-error-code], [data-testid*="error"]',
    )
    .filter({ hasText: /\b401\b|Unauthorized/i });
  await expect(authenticationErrorSurface).toHaveCount(0);
  if (screen === 'search') {
    await expect(page.getByTestId('search-result-card').first()).toBeVisible();
  } else if (screen === 'saved') {
    await expect(
      page.getByRole('heading', { name: /저장한 글/ }),
    ).toBeVisible();
  } else if (screen === 'profile') {
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  } else if (screen === 'my') {
    await expect(page.getByRole('heading', { name: '프로필' })).toBeVisible();
  } else if (screen === 'noti') {
    await expect(page.getByRole('heading', { name: '알림' })).toBeVisible();
  }
}

test('로그인 세션으로 요청된 5개 화면을 mobile과 desktop으로 재촬영한다', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  await authenticatePage(page, request);
  const profileUuid = await discoverPublicProfileUuid(request);
  const screens = [
    { name: 'search', route: `/search?q=${encodeURIComponent(SEARCH_QUERY)}` },
    { name: 'saved', route: '/saved-posts' },
    { name: 'profile', route: `/members/${profileUuid}` },
    { name: 'my', route: '/my-page' },
    { name: 'noti', route: '/notification' },
  ] as const;

  for (const screen of screens) {
    await mkdir(path.join(outputRoot, screen.name), { recursive: true });
    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const searchResponse =
        screen.name === 'search'
          ? page.waitForResponse(
              (response) =>
                new URL(response.url()).pathname === '/api/v1/search' &&
                response.request().method() === 'GET',
            )
          : undefined;
      const response = await page.goto(screen.route, {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status()).toBeLessThan(400);
      if (searchResponse) expect((await searchResponse).status()).toBe(200);
      await dismissOnboardingModalIfPresent(page);
      await assertAuthenticatedScreen(page, screen.name);
      await page.screenshot({
        path: path.join(outputRoot, screen.name, `impl-${viewport.name}.png`),
        animations: 'disabled',
        fullPage: false,
      });
    }
  }
});
