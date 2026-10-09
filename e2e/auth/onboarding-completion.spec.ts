import { expect, type Page, test } from '@playwright/test';
import {
  authenticatePage,
  requiredMemberId,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

// 온보딩 완료모달 목표기반 추천 CTA 검증.
// 상태별 dev 회원으로 인증하고, 외부 의존 API는 page.route로 목킹해 모달 플로우를 구동한다.
//
// 분기(step3 목표 → CTA): 업무자동화 > 수익화 > 기본(그 외)
//   업무 자동화 도구          → /class/claude-cowork
//   수익화 서비스(창업, 부업) → /class/vibe-intro-claude-code
//   그 외(내 포트폴리오 등)   → /class/vibe-intro-claude-code

const ONBOARDING_PATH = '/class?onboarding=true';

// ─── Route Mocks ────────────────────────────────────────────────────────────

// 모든 요청은 origin 무관 — path 기준 substring 정규식으로 매칭.
async function mockOnboardingApis(page: Page): Promise<void> {
  await page.route(/\/nicknames\/check/, (route) =>
    route.fulfill({ json: { content: { available: true } } }),
  );
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
  await page.route(/\/class-onboarding\/me\/step-[123]/, (route) =>
    route.fulfill({ status: 200, json: { content: {} } }),
  );
  await page.route(/\/class-onboarding\/me\/complete/, (route) =>
    route.fulfill({
      status: 200,
      json: {
        content: { completed: true, completedAt: '2026-08-07T00:00:00Z' },
      },
    }),
  );
  await page.route(/\/members\/\d+\/profile/, (route) =>
    route.fulfill({
      status: 200,
      json: {
        content: { isVerified: true, memberProfile: { tel: '01012345678' } },
      },
    }),
  );
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
              status: 'OPEN',
              tags: [],
            },
            {
              courseId: 2,
              slug: 'claude-cowork',
              title: 'Cowork 입문자',
              status: 'OPEN',
              tags: [],
            },
          ],
        },
      },
    }),
  );
}

// step1~3 공통 구동 → step4(완료) 화면 진입.
async function driveToCompletion(page: Page, goalLabel: string): Promise<void> {
  await page.goto(ONBOARDING_PATH, { waitUntil: 'load' });

  // ── screen1: 닉네임 + 약관 + 관심분야 ──
  const nicknameInput = page.getByLabel('닉네임');
  await expect(nicknameInput).toBeVisible({ timeout: 10000 });
  await nicknameInput.fill('테스트빌더');
  await page.getByRole('button', { name: '중복 확인' }).click();
  await expect(page.getByText('사용 가능한 닉네임이에요')).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole('button', { name: /개인정보 수집이용동의/ }).click();
  await page.getByRole('button', { name: /서비스 이용약관동의/ }).click();
  await page.getByRole('button', { name: goalLabel, exact: true }).click();
  await page.getByRole('button', { name: '다음' }).click();

  // ── screen2: 직무 + 경력 ──
  await page.getByRole('button', { name: '마케터' }).click();
  await page.getByRole('button', { name: '주니어(0~3년)' }).click();
  await page.getByRole('button', { name: '다음' }).click();

  // ── screen3: AI 활용 수준 ──
  await page
    .getByRole('button', { name: /AI한테 질문하고 답변 활용해본 적 있어요/ })
    .click();
  await page.getByRole('button', { name: '다음' }).click();
}

async function expectCourseNavigation(
  page: Page,
  ctaName: string,
  expectedPath: string,
): Promise<void> {
  const [targetRequest] = await Promise.all([
    page.waitForRequest(
      (request) => new URL(request.url()).pathname === expectedPath,
    ),
    page.getByRole('button', { name: ctaName }).click(),
  ]);

  expect(new URL(targetRequest.url()).pathname).toBe(expectedPath);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

test.describe('온보딩 완료모달 추천 CTA', () => {
  // 전역 storageState 대신 온보딩 미완료 전용 회원을 사용한다.
  test.use({ storageState: { cookies: [], origins: [] } });
  test.beforeEach(async ({ page, request }) => {
    await authenticatePage(
      page,
      request,
      requiredMemberId('E2E_ONBOARDING_INCOMPLETE_MEMBER_ID'),
    );
    await mockOnboardingApis(page);
  });

  test('목표 "업무 자동화 도구" → Cowork 코스 추천 + /class/claude-cowork 이동', async ({
    page,
  }) => {
    await driveToCompletion(page, '업무 자동화 도구');

    await expect(
      page.getByText('Cowork 입문자 코스를 추천드려요!'),
    ).toBeVisible({ timeout: 5000 });
    const cta = page.getByRole('button', {
      name: 'Cowork 입문자 코스 둘러보기',
    });
    await expect(cta).toBeVisible();

    await expectCourseNavigation(
      page,
      'Cowork 입문자 코스 둘러보기',
      '/class/claude-cowork',
    );
  });

  test('목표 "수익화 서비스(창업, 부업)" → 수익화 트랙 준비중 + /class/vibe-intro-claude-code 이동', async ({
    page,
  }) => {
    await driveToCompletion(page, '수익화 서비스(창업, 부업)');

    await expect(
      page.getByText('ZERO-ONE에서 바이브 코딩 수익화 트랙을 준비하고 있어요.'),
    ).toBeVisible({ timeout: 5000 });
    await expectCourseNavigation(
      page,
      '바이브 코딩 입문자 코스 둘러보기',
      '/class/vibe-intro-claude-code',
    );
  });

  test('목표 "내 포트폴리오 사이트"(기본) → 바이브 코딩 입문자 추천 + /class/vibe-intro-claude-code 이동', async ({
    page,
  }) => {
    await driveToCompletion(page, '내 포트폴리오 사이트');

    await expect(
      page.getByText('바이브 코딩 입문자 코스를 추천드려요!'),
    ).toBeVisible({ timeout: 5000 });
    await expectCourseNavigation(
      page,
      '바이브 코딩 입문자 코스 둘러보기',
      '/class/vibe-intro-claude-code',
    );
  });
});
