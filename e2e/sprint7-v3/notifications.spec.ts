/** 담당 테스트 케이스: S7-NOTI-N01, S7-NOTI-E01, S7-NOTI-Z01, S7-NOTI-A01 */
// biome-ignore assist/source/organizeImports: repository ESLint import/order is authoritative.
import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from '@playwright/test';

import {
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

const WEB_BASE_URL = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_ORIGIN =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

// 서버가 안전한 fallback 목적지로 내려주는 경로 중 일부는 코드상 의도적으로
// permanentRedirect()를 거는 "영구 이동 경유 경로"다. 이 경우 최종 URL이
// 선언된 목적지 자체가 아니라 그 경로가 리다이렉트하는 정식 목적지여도 정상이다.
// 근거: src/app/(service)/(my)/my-page/notification/page.tsx 전문 —
//   export default function NotificationFallbackRedirect() {
//     permanentRedirect('/notification');
//   }
// 이 맵은 실제 코드에 존재하는 permanentRedirect 호출만 등록한다(임의 허용 아님).
const KNOWN_FALLBACK_REDIRECTS: Readonly<Record<string, string>> = {
  '/my-page/notification': '/notification',
};

test.use({ storageState: { cookies: [], origins: [] } });

interface ApiEnvelope<T> {
  content: T;
}

type JsonRecord = Record<string, unknown>;

function requiredMemberId(name = 'E2E_SPRINT7_MEMBER_ID'): number {
  const value = Number(process.env[name]?.trim());
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} is required and must be a positive integer`);
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

async function authenticatePage(
  page: Page,
  request: APIRequestContext,
  memberId = requiredMemberId(),
): Promise<string> {
  const token = await mintMemberToken(request, memberId);
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
  const content = (value as JsonRecord).content;
  expect(content).toBeTruthy();
  expect(typeof content).toBe('object');
  return content as JsonRecord;
}

test.use({ storageState: { cookies: [], origins: [] } });

type Notification = Record<string, unknown> & {
  destination?: { state?: unknown; path?: unknown; message?: unknown };
};

const notifications = async (request: APIRequestContext, token: string) => {
  const response = await request.get(`${API_ORIGIN}/api/v1/notifications`, {
    headers: bearer(token),
    params: { page: 1, size: 50 },
  });
  expect(response.status()).toBe(200);
  const content = unwrapContent(await response.json());
  expect(Array.isArray(content.content)).toBe(true);
  return content.content as Notification[];
};

test.describe
  .serial('Sprint 7 V3 알림 목적지 @responsive', () => {
    test('정상: 알림 클릭은 same-origin 목적지로 이동하고 읽음 처리한다', async ({
      page,
      request,
    }) => {
      const token = await mintMemberToken(request);
      const items = await notifications(request, token);
      const target = items.find(
        (item) =>
          item.destination?.state === 'AVAILABLE' &&
          typeof item.destination.path === 'string',
      );
      expect(target, 'AVAILABLE notification seed missing').toBeTruthy();
      expect(typeof target?.id).toBe('number');
      const path = String(target?.destination?.path);
      expect(path).toMatch(/^\/(?!\/)/);
      expect(path).not.toMatch(/\.\.|javascript:|https?:/i);

      await authenticatePage(page, request);
      await page.goto('/notification', { waitUntil: 'domcontentloaded' });
      await dismissOnboardingModalIfPresent(page);
      const targetNotification = page.getByTestId(
        `notification-${String(target?.id)}`,
      );
      await expect(
        targetNotification.getByText(String(target?.title), { exact: true }),
      ).toBeVisible();
      await targetNotification.click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(path);

      const refreshed = await notifications(request, token);
      expect(refreshed.find((item) => item.id === target?.id)?.isRead).toBe(
        true,
      );
    });

    test('예외: 삭제되거나 금지된 목적지는 404 대신 안전한 fallback을 제공한다', async ({
      page,
      request,
    }) => {
      const token = await mintMemberToken(request);
      const items = await notifications(request, token);
      const fallback = items.find(
        (item) => item.destination?.state === 'FALLBACK',
      );
      expect(fallback, 'FALLBACK notification seed missing').toBeTruthy();
      expect(typeof fallback?.id).toBe('number');
      const path = String(fallback?.destination?.path);
      expect(path).toMatch(/^\/(?!\/)/);
      expect(fallback?.destination?.message).toBeTruthy();

      await authenticatePage(page, request);
      await page.goto('/notification', { waitUntil: 'domcontentloaded' });
      await dismissOnboardingModalIfPresent(page);
      const fallbackNotification = page.getByTestId(
        `notification-${String(fallback?.id)}`,
      );
      await expect(
        fallbackNotification.getByText(String(fallback?.title), {
          exact: true,
        }),
      ).toBeVisible();
      await fallbackNotification.click();
      const expectedFinalPath = KNOWN_FALLBACK_REDIRECTS[path] ?? path;
      await expect
        .poll(() => new URL(page.url()).pathname)
        .toBe(expectedFinalPath);
      await expect(page.getByText(/404|Not Found/i)).toHaveCount(0);
    });

    test('빈 상태: 알림 0건이어도 헤더 종과 설정 진입은 유지한다', async ({
      page,
      request,
    }) => {
      const emptyId = requiredMemberId('E2E_SPRINT7_EMPTY_MEMBER_ID');
      const token = await mintMemberToken(request, emptyId);
      expect(await notifications(request, token)).toHaveLength(0);
      await authenticatePage(page, request, emptyId);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await dismissOnboardingModalIfPresent(page);
      await page.getByRole('button', { name: '알림' }).click();
      await expect(page.getByText('아직 새 소식이 없어요')).toBeVisible();
      await expect(
        page.getByRole('link', { name: '알림 설정' }),
      ).toHaveAttribute('href', '/notification/settings');
    });

    test('권한 없음: 비회원 알림 API는 401이고 화면에 401 문자열을 노출하지 않는다', async ({
      page,
      request,
    }) => {
      const response = await request.get(`${API_ORIGIN}/api/v1/notifications`);
      expect(response.status()).toBe(401);
      await page.goto('/notification', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/401|Unauthorized/i)).toHaveCount(0);
      await expect.poll(() => new URL(page.url()).pathname).toBe('/');
      await expect(
        page.getByRole('button', { name: '로그인 / 회원가입' }).first(),
      ).toBeVisible();
    });
  });
