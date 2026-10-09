import { expect, test } from '@playwright/test';

import {
  API_BASE_URL,
  authenticatePage,
  requiredMemberId,
  WEB_BASE_URL,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

/**
 * 실행 계정 조건: class onboarding 상태가 STEP_3 또는 STEP_4_READY여야 한다.
 * 이 테스트는 실제 lead/cohort 레코드를 만들므로 전용 스테이징 fixture만 사용하고,
 * 실행 뒤 onboarding/profile/marketing/cohort 상태를 원복한다.
 *
 * 실행 예:
 * E2E_RETENTION_ONBOARDING_MEMBER_ID=<step4-ready-member-id> \\
 *   E2E_BASE_URL=https://test.zeroone.it.kr \\
 *   npx playwright test e2e/retention/onboarding-capture.spec.ts
 */
test.describe
  .serial('SPRINT7 리텐션: 온보딩 리드 캡처 @auth @writes-data', () => {
    test.beforeEach(async ({ page, request }) => {
      if (process.env.E2E_BRANCH_PROXY_DEV_API === '1') {
        await page.route(
          `${API_BASE_URL}/api/v6/class-onboarding/**`,
          async (route) => {
            const browserRequest = route.request();
            if (browserRequest.method() === 'OPTIONS') {
              await route.fulfill({
                status: 204,
                headers: {
                  'access-control-allow-credentials': 'true',
                  'access-control-allow-headers': 'authorization,content-type',
                  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE',
                  'access-control-allow-origin': WEB_BASE_URL,
                },
              });
              return;
            }
            const headers = browserRequest.headers();
            delete headers.host;
            delete headers.origin;
            delete headers.referer;
            const apiResponse = await request.fetch(browserRequest.url(), {
              method: browserRequest.method(),
              headers,
              data: browserRequest.postDataBuffer() ?? undefined,
            });
            await route.fulfill({
              response: apiResponse,
              headers: {
                ...apiResponse.headers(),
                'access-control-allow-credentials': 'true',
                'access-control-allow-origin': WEB_BASE_URL,
              },
            });
          },
        );
      }
      await authenticatePage(
        page,
        request,
        requiredMemberId('E2E_RETENTION_ONBOARDING_MEMBER_ID'),
      );
    });

    test.afterEach(async ({ page }) => {
      await page.unrouteAll({ behavior: 'wait' });
    });

    const submitRetentionStep = async (
      page: import('@playwright/test').Page,
    ) => {
      const blockingOnboardingModal = page
        .locator('div.fixed.inset-0.z-50')
        .filter({
          has: page.getByRole('button', { name: '닫기', exact: true }),
        })
        .first();
      await blockingOnboardingModal
        .waitFor({ state: 'visible', timeout: 10_000 })
        .catch(() => {});
      if (await blockingOnboardingModal.isVisible()) {
        await blockingOnboardingModal
          .getByRole('button', { name: '닫기', exact: true })
          .click();
      }
      await page.getByRole('button', { name: '웹앱 수익화' }).click();
      await page
        .getByLabel('안내받을 이메일')
        .fill('retention-e2e@zeroone.it.kr');

      const responsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            '/api/v6/class-onboarding/me/step-4' &&
          response.request().method() === 'POST',
        { timeout: 15_000 },
      );
      await page.getByRole('button', { name: '목표 방으로 들어가기' }).click();
      return responsePromise;
    };

    test('목표·이메일을 제출하고 step-4 성공 뒤 홈으로 이동한다', async ({
      page,
    }) => {
      await page.goto('/onboarding/retention', {
        waitUntil: 'domcontentloaded',
      });
      const response = await submitRetentionStep(page);
      expect(response.status()).toBe(200);
      const body = (await response.json()) as {
        content?: {
          onboardingStep?: string;
          emailSyncQueued?: boolean;
          seminarAssigned?: boolean;
        };
      };
      expect(body.content?.onboardingStep).toBe('COMPLETED');
      expect(body.content?.emailSyncQueued).toBe(false);
      await expect(page).toHaveURL(
        (url) => url.pathname === '/' && url.search === '',
        { timeout: 15_000 },
      );
    });

    test('무효 세미나 자동 배정 실패 안내에서 홈 링크로 이동한다', async ({
      page,
    }) => {
      await page.goto('/onboarding/retention?cohort=e2e-invalid-seminar', {
        waitUntil: 'domcontentloaded',
      });
      const response = await submitRetentionStep(page);
      expect(response.status()).toBe(200);
      const body = (await response.json()) as {
        content?: { seminarAssigned?: boolean };
      };
      expect(body.content?.seminarAssigned).toBe(false);
      await expect(
        page.getByRole('heading', {
          name: '기수에 자동 배정되지 않았어요.',
        }),
      ).toBeVisible();
      await page.getByRole('link', { name: '홈으로 이동하기' }).click();
      await expect(page).toHaveURL(
        (url) => url.pathname === '/' && url.search === '',
        { timeout: 15_000 },
      );
    });
  });
