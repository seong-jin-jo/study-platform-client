/** 담당 테스트 케이스: S7-PROFILE-N01, S7-PROFILE-E01, S7-PROFILE-Z01, S7-PROFILE-A01 */
// biome-ignore assist/source/organizeImports: repository ESLint import/order is authoritative.
import { type APIRequestContext, expect, test } from '@playwright/test';
import { injectAuth } from './helpers';

import {
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

const API_ORIGIN =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
const WEB_ORIGIN = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';

test.use({ storageState: { cookies: [], origins: [] } });

interface ApiEnvelope<T> {
  content: T;
}

type JsonRecord = Record<string, unknown>;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required for the Sprint 7 V3 real-environment suite`,
    );
  }
  return value;
}

function requiredMemberId(): number {
  const value = Number(requireEnv('E2E_SPRINT7_MEMBER_ID'));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('E2E_SPRINT7_MEMBER_ID must be a positive integer');
  }
  return value;
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function mintMemberToken(
  request: APIRequestContext,
  memberId = requiredMemberId(),
): Promise<string> {
  const configured = process.env.E2E_SPRINT7_MEMBER_TOKEN?.trim();
  if (configured && memberId === requiredMemberId()) return configured;

  const response = await request.get(
    `${API_ORIGIN}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
  );
  expect(response.status(), `QA token mint failed for member ${memberId}`).toBe(
    200,
  );
  const body = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
  expect(body.content.accessToken).toBeTruthy();
  return body.content.accessToken;
}

function unwrapContent(value: unknown): JsonRecord {
  expect(value).toBeTruthy();
  expect(typeof value).toBe('object');
  const content = (value as JsonRecord).content;
  expect(content).toBeTruthy();
  expect(typeof content).toBe('object');
  return content as JsonRecord;
}

function itemsOf(content: JsonRecord): JsonRecord[] {
  const items = content.items;
  expect(Array.isArray(items)).toBe(true);
  return items as JsonRecord[];
}

function recursiveKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(recursiveKeys);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as JsonRecord).flatMap(([key, child]) => [
    key,
    ...recursiveKeys(child),
  ]);
}

function expectNoKeys(value: unknown, forbidden: RegExp): void {
  const offending = recursiveKeys(value).filter((key) => forbidden.test(key));
  expect(offending, `forbidden keys: ${offending.join(', ')}`).toEqual([]);
}

async function expectWithinViewport(
  locator: ReturnType<import('@playwright/test').Page['getByRole']>,
  viewport: { width: number; height: number },
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, 'modal must have a rendered bounding box').not.toBeNull();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect(box?.y).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
    viewport.height,
  );
}

async function discoverPublicProfileUuid(
  request: APIRequestContext,
): Promise<string> {
  const response = await request.get(
    `${API_ORIGIN}/api/v1/members/public-profile-sitemap-resources`,
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

const forbiddenProfileKeys =
  /^(memberId|email|tel|phone|birthDate|oidcId|loginId|payment|coupon|sincerityTemp|rep|reputation|balance|score|grade|ledger|cohort|generation|privateRoom|deletedPost)$/i;

test.describe('Sprint 7 V3 공개 프로필 @responsive', () => {
  test('정상: UUID 주소와 공개 allowlist aggregate만 노출한다', async ({
    page,
    request,
  }) => {
    const uuid = requireEnv('E2E_SPRINT7_PUBLIC_PROFILE_UUID');
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    const response = await request.get(
      `${API_ORIGIN}/api/v1/members/${uuid}/public-profile`,
    );
    expect(response.status()).toBe(200);
    const content = unwrapContent(await response.json());
    expect(content.publicProfileUuid).toBe(uuid);
    expect(String(content.canonicalPath)).toBe(`/members/${uuid}`);
    expect(String(content.weeksTogetherLabel)).toMatch(
      /^\d+주째 함께하고 있어요$/,
    );
    expectNoKeys(content, forbiddenProfileKeys);

    await page.goto(`/members/${uuid}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/평판|점수|등급/)).toHaveCount(0);
  });

  test('예외: 잘못된 UUID와 미존재 UUID는 공개 정보 없이 404다', async ({
    request,
  }) => {
    for (const uuid of ['123', '00000000-0000-4000-8000-000000000000']) {
      const response = await request.get(
        `${API_ORIGIN}/api/v1/members/${uuid}/public-profile`,
      );
      expect(response.status()).toBe(404);
      expectNoKeys(await response.json(), forbiddenProfileKeys);
    }
  });

  test('빈 상태: 공개 활동이 없는 ACTIVE 프로필은 200 indexable과 빈 목록을 준다', async ({
    page,
    request,
  }) => {
    const uuid = requireEnv('E2E_SPRINT7_EMPTY_PROFILE_UUID');
    const response = await request.get(
      `${API_ORIGIN}/api/v1/members/${uuid}/public-profile`,
    );
    expect(response.status()).toBe(200);
    const content = unwrapContent(await response.json());
    const eligibility = content.indexEligibility as Record<string, unknown>;
    expect(eligibility.indexable).toBe(true);
    expect(eligibility.reason).toBe('ACTIVE_PUBLIC_PROFILE');
    expect(itemsOf(content.rooms as Record<string, unknown>)).toHaveLength(0);
    expect(itemsOf(content.posts as Record<string, unknown>)).toHaveLength(0);

    const crawlerResponse = await request.get(`${WEB_ORIGIN}/members/${uuid}`, {
      headers: { 'User-Agent': 'Googlebot' },
    });
    expect(crawlerResponse.status()).toBe(200);
    const crawlerHtml = await crawlerResponse.text();
    const robotsTag = crawlerHtml
      .match(/<meta\b[^>]*>/gi)
      ?.find((tag) => /\bname=["']robots["']/i.test(tag));
    expect(robotsTag, 'crawler HTML robots meta is missing').toBeTruthy();
    expect(robotsTag).toMatch(/\bcontent=["']index,follow["']/i);
    expect(robotsTag).not.toMatch(/noindex/i);

    await page.goto(`/members/${uuid}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('아직 정착한 방이 없어요')).toBeVisible();
    await expect(page.getByText('아직 남긴 글이 없어요')).toBeVisible();
  });

  test('권한 없음: guest와 로그인 사용자가 동일한 public contract를 받는다', async ({
    request,
  }) => {
    const uuid = await discoverPublicProfileUuid(request);
    const guest = await request.get(
      `${API_ORIGIN}/api/v1/members/${uuid}/public-profile`,
    );
    const member = await request.get(
      `${API_ORIGIN}/api/v1/members/${uuid}/public-profile`,
      { headers: bearer(await mintMemberToken(request)) },
    );
    expect(guest.status()).toBe(200);
    expect(member.status()).toBe(200);
    expect(unwrapContent(await member.json())).toEqual(
      unwrapContent(await guest.json()),
    );
  });

  test('인앱 경로: 마이페이지 공개 보기는 같은 모달을 열고 뒤로가기는 원래 자리를 보존한다', async ({
    context,
    page,
    request,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await injectAuth(context, await mintMemberToken(request));

    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/my-page', { waitUntil: 'domcontentloaded' });

      const publicViewLink = page.getByRole('link', {
        name: '남에게 보이는 내 프로필 보기',
      });
      await expect(publicViewLink).toBeVisible();
      await publicViewLink.click();

      const dialog = page.getByRole('dialog', { name: /공개 프로필/ });
      const closeButton = dialog.getByRole('button', { name: '프로필 닫기' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('link', { name: '고치기' })).toBeVisible();
      await expect(dialog.getByRole('link', { name: '신고' })).toHaveCount(0);
      await expect(
        dialog.getByText(/휴대폰 번호와 이메일, 결제 내역과 평판/),
      ).toBeVisible();
      await expect(dialog.getByText('이 사람이 있는 방')).toBeVisible();
      await expect(dialog.getByText('최근에 쓴 글')).toBeVisible();
      await expectWithinViewport(dialog, viewport);
      await expectWithinViewport(closeButton, viewport);
      await expect
        .poll(() =>
          page.evaluate(() => getComputedStyle(document.body).overflow),
        )
        .toBe('hidden');

      await closeButton.click();
      await expect(dialog).toBeHidden();
      await expect(page).toHaveURL(/\/my-page$/);
      await expect
        .poll(() =>
          page.evaluate(() => getComputedStyle(document.body).overflow),
        )
        .not.toBe('hidden');
    }

    expect(pageErrors).toEqual([]);
  });
});
