import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import type { MyCoursePaymentListItemResponse } from '../../src/types/api/course.types';
import {
  authenticatePage,
  requiredMemberId,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTH_FILE = 'e2e/fixtures/auth.json';
const PAYMENT_MANAGEMENT_PATH = '/class-payment-management';
const COURSE_ID = 1;
const PAYMENT_ID = 200;
const PAYMENT_DISABLED_REASON =
  '결제 관리 기능이 dev에서 준비 중 상태로 비활성화됨; 기능이 활성화되면 기존 assertion을 자동 재실행합니다.';

// ─── Localhost auth cookie injection ─────────────────────────────────────────

test.beforeEach(async ({ context, baseURL }) => {
  if (baseURL?.startsWith('http://localhost') && existsSync(AUTH_FILE)) {
    const { cookies } = JSON.parse(readFileSync(AUTH_FILE, 'utf-8')) as {
      cookies: {
        name: string;
        value: string;
        domain: string;
        path: string;
        expires: number;
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'Strict' | 'Lax' | 'None';
      }[];
    };
    await context.addCookies(
      cookies
        // __Host-/__Secure- 접두 쿠키는 secure=true(+도메인 없음)가 강제라
        // localhost(secure=false)로 못 옮긴다. 앱 세션엔 불필요하므로 제외.
        .filter(
          (c) =>
            !c.name.startsWith('__Host-') && !c.name.startsWith('__Secure-'),
        )
        // localhost 주입 시 Chromium 이 거부하는 경우를 정규화한다:
        // (1) secure=false 인데 sameSite='None'(secure 필수) → 무효 조합
        // (2) expires 가 소수(codegen 저장본) → CDP 는 정수만 허용
        .map((c) => ({
          ...c,
          domain: 'localhost',
          secure: false,
          sameSite: c.sameSite === 'None' ? 'Lax' : c.sameSite,
          expires: c.expires > 0 ? Math.floor(c.expires) : c.expires,
        })),
    );
  }
});

// ─── Mock Factories ───────────────────────────────────────────────────────────

function makeTransaction(
  overrides: Partial<MyCoursePaymentListItemResponse> = {},
): MyCoursePaymentListItemResponse {
  return {
    paymentId: PAYMENT_ID,
    paymentCode: 'PAY-TEST-002',
    courseId: COURSE_ID,
    courseSlug: 'vibe-intro-claude-code',
    courseTitle: '바이브 코딩 입문자',
    planId: 1,
    planCode: 'ALL_IN_ONE',
    planName: '올인원',
    amount: 99000,
    status: 'REQUESTED',
    paymentMethod: 'CARD',
    tossReceiptUrl: null,
    virtualAccountNumber: null,
    virtualAccountDueDate: null,
    requestedAt: '2026-08-07T09:00:00.000Z',
    paidAt: null,
    canceledAt: null,
    createdAt: '2026-08-07T09:00:00.000Z',
    cancellable: true,
    canRequestRefund: false,
    canCancelPayment: true,
    ...overrides,
  };
}

function makeTransactionPage(transactions: MyCoursePaymentListItemResponse[]) {
  return {
    content: {
      content: transactions,
      totalElements: transactions.length,
      totalPages: 1,
      size: 8,
      number: 0,
    },
  };
}

// ─── Route Mock Helpers ───────────────────────────────────────────────────────

async function mockTransactionsApi(
  page: Page,
  transactions: MyCoursePaymentListItemResponse[],
) {
  await page.route(
    /\/api\/v5\/mypage\/course-payments(?:\?|$)/,
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: makeTransactionPage(transactions) });
      } else {
        await route.continue();
      }
    },
  );
}

// POST /api/v5/courses/{courseId}/payments/{paymentId}/cancel
async function mockCancelPaymentApi(page: Page, status = 200) {
  await page.route(
    /\/api\/v5\/courses\/\d+\/payments\/\d+\/cancel$/,
    async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status,
          json: { content: null },
        });
      } else {
        await route.continue();
      }
    },
  );
}

async function gotoPaymentManagement(page: Page) {
  const paymentResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes('/api/v5/mypage/course-payments') &&
        response.request().method() === 'GET',
      { timeout: 10000 },
    )
    .catch(() => null);

  await page.goto(PAYMENT_MANAGEMENT_PATH, { waitUntil: 'load' });

  const isPaymentDisabled = await page
    .getByText(/결제 관리[은는] 준비 중이에요/)
    .isVisible();
  test.skip(isPaymentDisabled, PAYMENT_DISABLED_REASON);

  expect(
    await paymentResponse,
    '결제 관리 기능이 활성화된 화면은 결제 목록 API를 호출해야 합니다.',
  ).not.toBeNull();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

test.describe('결제 관리 — 결제 취소 (PAYMENT_REQUESTED) @auth', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticatePage(
      page,
      request,
      requiredMemberId('E2E_COURSE_PAYMENT_REQUESTED_MEMBER_ID'),
    );
    await mockTransactionsApi(page, [makeTransaction()]);
  });

  test('REQUESTED → 클래스명·"결제 요청" 배지·"결제취소" 버튼 표시', async ({
    page,
  }) => {
    await gotoPaymentManagement(page);

    await expect(page.getByText('바이브 코딩 입문자').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('결제 요청').first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: '결제취소' }).first(),
    ).toBeVisible();
  });

  test('"결제취소" 클릭 → 현행 취소 모달·경고 표시', async ({ page }) => {
    await gotoPaymentManagement(page);
    await expect(
      page.getByRole('button', { name: '결제취소' }).first(),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: '결제취소' }).first().click();

    await expect(
      page.getByText(
        '결제를 취소하시겠습니까? 취소 후에는 되돌릴 수 없습니다.',
      ),
    ).toBeVisible({ timeout: 5000 });
  });

  test('"취소하기" → POST /courses/{courseId}/payments/{id}/cancel → 완료 모달', async ({
    page,
  }) => {
    await mockCancelPaymentApi(page);
    await gotoPaymentManagement(page);

    await page.getByRole('button', { name: '결제취소' }).first().click();
    await expect(
      page.getByText(
        '결제를 취소하시겠습니까? 취소 후에는 되돌릴 수 없습니다.',
      ),
    ).toBeVisible({ timeout: 5000 });

    const [cancelResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/cancel') && r.request().method() === 'POST',
      ),
      page
        .getByRole('dialog')
        .getByRole('button', { name: '취소하기' })
        .click(),
    ]);

    expect(cancelResponse.status()).toBe(200);
    await expect(page.getByText('결제가 취소되었습니다')).toBeVisible({
      timeout: 5000,
    });
  });

  test('"돌아가기" 클릭 → 모달 닫힘, cancel API 미호출', async ({ page }) => {
    await gotoPaymentManagement(page);

    await page.getByRole('button', { name: '결제취소' }).first().click();
    await expect(
      page.getByText(
        '결제를 취소하시겠습니까? 취소 후에는 되돌릴 수 없습니다.',
      ),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: '돌아가기' }).click();

    await expect(
      page.getByText(
        '결제를 취소하시겠습니까? 취소 후에는 되돌릴 수 없습니다.',
      ),
    ).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('결제 관리 — 결제 취소 (PAYMENT_WAITING_FOR_DEPOSIT) @auth', () => {
  test('WAITING_FOR_DEPOSIT → "입금 대기"·"결제취소" 버튼 표시', async ({
    page,
    request,
  }) => {
    await authenticatePage(
      page,
      request,
      requiredMemberId('E2E_COURSE_PAYMENT_WAITING_MEMBER_ID'),
    );
    await mockTransactionsApi(page, [
      makeTransaction({
        status: 'WAITING_FOR_DEPOSIT',
        paymentMethod: 'VIRTUAL_ACCOUNT',
      }),
    ]);
    await gotoPaymentManagement(page);

    await expect(page.getByText('입금 대기').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole('button', { name: '결제취소' }).first(),
    ).toBeVisible();
  });
});

test.describe('결제 관리 — PAYMENT_CANCELED 상태 @auth', () => {
  test('"취소 완료" 배지 표시, "결제취소" 버튼 없음', async ({
    page,
    request,
  }) => {
    await authenticatePage(
      page,
      request,
      requiredMemberId('E2E_COURSE_PAYMENT_CANCELED_MEMBER_ID'),
    );
    await mockTransactionsApi(page, [
      makeTransaction({
        status: 'CANCELED',
        cancellable: false,
        canCancelPayment: false,
      }),
    ]);
    await gotoPaymentManagement(page);

    await expect(page.getByText('취소 완료').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole('button', { name: '결제취소' }),
    ).not.toBeVisible();
  });
});
