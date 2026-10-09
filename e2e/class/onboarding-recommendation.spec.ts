import { expect, type Page, test } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import {
  authenticatePage,
  requiredMemberId,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

// 온보딩 완료 후 관심분야 선택에 따라 올바른 코스 추천이 표시되는지 검증한다.
// 추천 분기: 업무 자동화 도구 → Cowork / 수익화 서비스 → 수익화 트랙 / 그 외 → 입문자 코스
// 모든 API는 page.route()로 인터셉트 — 스테이징 상태/기존 온보딩 데이터에 독립적이다.

const AUTH_FILE = 'e2e/fixtures/auth.json';

interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

// ─── Auth cookie injection (localhost ↔ staging) ───────────────────────────

test.beforeEach(async ({ context, baseURL }) => {
  if (!existsSync(AUTH_FILE)) return;
  const { cookies } = JSON.parse(readFileSync(AUTH_FILE, 'utf-8')) as {
    cookies: CookieEntry[];
  };
  if (baseURL?.startsWith('http://localhost')) {
    await context.addCookies(
      cookies
        .filter(
          (c) =>
            !c.name.startsWith('__Host-') && !c.name.startsWith('__Secure-'),
        )
        .map((c) => ({
          ...c,
          domain: 'localhost',
          secure: false,
          sameSite: c.sameSite === 'None' ? ('Lax' as const) : c.sameSite,
          expires: c.expires > 0 ? Math.floor(c.expires) : c.expires,
        })),
    );
  } else {
    const tokenCookie = cookies.find((c) => c.name === 'accessToken');
    if (tokenCookie && baseURL) {
      await context.addCookies([
        {
          ...tokenCookie,
          domain: new URL(baseURL).hostname,
          expires: Math.floor(Date.now() / 1000) + 3600,
        },
      ]);
    }
  }
});

// ─── Shared helper ─────────────────────────────────────────────────────────

async function fillOnboarding(page: Page, interestLabel: string) {
  // Screen 1: 닉네임 + 약관 동의 + 관심분야
  await page.getByLabel('닉네임').fill('테스터');
  await page.getByRole('button', { name: '중복 확인' }).click();
  await expect(page.getByText('사용 가능한 닉네임이에요')).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole('button', { name: /개인정보 수집이용동의/ }).click();
  await page.getByRole('button', { name: /서비스 이용약관동의/ }).click();
  await page.getByRole('button', { name: interestLabel, exact: true }).click();

  const next1 = page.getByRole('button', { name: '다음' });
  await expect(next1).toBeEnabled({ timeout: 3000 });
  await next1.click();

  // Screen 2: 직무 + 경력
  await expect(page.getByText('해당되는 직무를 선택해주세요')).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole('button', { name: '마케터' }).click();
  await page.getByRole('button', { name: '주니어(0~3년)' }).click();

  const next2 = page.getByRole('button', { name: '다음' });
  await expect(next2).toBeEnabled({ timeout: 3000 });
  await next2.click();

  // Screen 3: 입문 수준 → "다음" 클릭으로 step-1/2/3 일괄 저장
  await expect(
    page.getByText('AI로 무언가를 어디까지 만들어 보셨나요'),
  ).toBeVisible({
    timeout: 5000,
  });
  await page
    .getByRole('button', { name: /AI한테 질문하고 답변 활용해본 적 있어요/ })
    .click();

  const next3 = page.getByRole('button', { name: '다음' });
  await expect(next3).toBeEnabled({ timeout: 3000 });
  await next3.click();
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

test.describe('온보딩 코스 추천 매칭 @auth', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticatePage(
      page,
      request,
      requiredMemberId('E2E_ONBOARDING_INCOMPLETE_MEMBER_ID'),
    );
    // GET /class-onboarding/me → 신규 유저 상태(미완료)
    await page.route(/\/class-onboarding\/me$/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 200, json: { content: {} } });
        return;
      }
      await route.fulfill({
        status: 200,
        json: {
          content: {
            lastSavedStep: null,
            nickname: null,
            vibeCodingExperienceLevel: null,
            jobs: [],
            career: null,
            interests: [],
            interestEtcText: null,
          },
        },
      });
    });

    // POST step-1/2/3
    await page.route(/\/class-onboarding\/me\/step-[123]/, (route) =>
      route.fulfill({ status: 200, json: { content: {} } }),
    );

    // POST complete (Screen 4 마운트 시 자동 호출)
    await page.route(/\/class-onboarding\/me\/complete/, (route) =>
      route.fulfill({
        status: 200,
        json: {
          content: { completed: true, completedAt: '2026-06-22T00:00:00Z' },
        },
      }),
    );

    // GET nickname availability
    await page.route(/\/nicknames\/check/, (route) =>
      route.fulfill({ status: 200, json: { content: { available: true } } }),
    );

    // GET /members/{id}/profile — 가입 단계 본인인증 게이트(완료 직전)는
    // 이미 인증된 회원으로 간주해 우회한다(본 spec은 추천 매칭 검증이 목적이며,
    // 미인증→본인인증 강제 플로우는 onboarding-completion.spec.ts에서 별도 검증).
    await page.route(/\/members\/\d+\/profile/, (route) =>
      route.fulfill({
        status: 200,
        json: {
          content: { isVerified: true, memberProfile: { tel: '01012345678' } },
        },
      }),
    );

    // GET /v5/courses — CTA 버튼 활성화에 필요
    await page.route(/\/v5\/courses/, (route) =>
      route.fulfill({
        status: 200,
        json: {
          content: {
            content: [
              {
                courseId: 1,
                slug: 'vibe-intro-claude-code',
                title: '바이브 코딩 입문자',
                headline: 'AI 도구로 나만의 첫 서비스를 만들어 보세요.',
                summary: '바이브 코딩 입문자 코스',
                status: 'OPEN',
                thumbnailUrl: null,
                learnerCount: 0,
                learnerLabel: '0명이 수강 중',
                regularPrice: null,
                discountPrice: null,
                ctaType: 'ENROLL',
                tags: [],
              },
            ],
          },
        },
      }),
    );

    await page.goto('/class?onboarding=true', { waitUntil: 'load' });
    // OnboardingTrigger가 query param을 감지하면 모달 오픈 후 router.replace('/class')
    await expect(page.getByText('만나서 반가워요!')).toBeVisible({
      timeout: 10000,
    });
  });

  test('업무 자동화 도구 → Cowork 추천', async ({ page }) => {
    await fillOnboarding(page, '업무 자동화 도구');

    await expect(
      page.getByText('Cowork 입문자 코스를 추천드려요!'),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('button', { name: 'Cowork 입문자 코스 둘러보기' }),
    ).toBeVisible();
  });

  test('수익화 서비스 → 수익화 트랙 추천', async ({ page }) => {
    await fillOnboarding(page, '수익화 서비스(창업, 부업)');

    await expect(
      page.getByText('ZERO-ONE에서 바이브 코딩 수익화 트랙을 준비하고 있어요.'),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('button', { name: '바이브 코딩 입문자 코스 둘러보기' }),
    ).toBeVisible();
  });

  test('포트폴리오 사이트 → 입문자 코스 추천 (기본)', async ({ page }) => {
    await fillOnboarding(page, '내 포트폴리오 사이트');

    await expect(
      page.getByText('바이브 코딩 입문자 코스를 추천드려요!'),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('button', { name: '바이브 코딩 입문자 코스 둘러보기' }),
    ).toBeVisible();
  });
});
