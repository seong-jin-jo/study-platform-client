import { expect, test } from '@playwright/test';
import {
  authenticatePage,
  requiredMemberId,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

test.describe('SPRINT7 리텐션: 인증 집계 화면 @auth', () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticatePage(
      page,
      request,
      requiredMemberId('E2E_RETENTION_AGGREGATE_MEMBER_ID'),
    );
  });

  test('홈 피드가 집계 API를 사용하고 핵심 섹션을 렌더한다', async ({
    page,
  }) => {
    const feedResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/home/feed' &&
        response.request().method() === 'GET',
      { timeout: 15_000 },
    );

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect((await feedResponse).status()).toBe(200);

    await expect(
      page.getByRole('heading', { name: '지금 뜨는 글' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '인사이트', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '인기 방, 목표가 같은 사람들' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '입장함' }).first(),
    ).toBeVisible();
  });

  test('스트릭과 내 코호트 화면이 인증 API 응답을 렌더한다', async ({
    page,
  }) => {
    const streakResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/streak/me' &&
        response.request().method() === 'GET',
      { timeout: 15_000 },
    );
    await page.goto('/streak', { waitUntil: 'domcontentloaded' });
    expect((await streakResponse).status()).toBe(200);
    await expect(page.getByText('일 연속 학습')).toBeVisible();
    await expect(page.getByText('마일스톤', { exact: true })).toBeVisible();

    const cohortResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/cohorts/me' &&
        response.request().method() === 'GET',
      { timeout: 15_000 },
    );
    await page.goto('/cohorts/1', { waitUntil: 'domcontentloaded' });
    expect((await cohortResponse).status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: '웹앱 수익화' }),
    ).toBeVisible();
    await expect(page.getByText('방장 · 환영 인사')).toBeVisible();
  });

  test('세미나 랜딩과 인사이트 진행 화면을 렌더한다', async ({ page }) => {
    await page.goto('/seminar/e2e-retention', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: /오늘 만든 걸/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /카카오로 3초 시작하기/ }),
    ).toHaveAttribute('href', '/onboarding/retention?cohort=e2e-retention');

    const progressResponse = await page.goto(
      '/insights/e2e-retention/progress',
      {
        waitUntil: 'domcontentloaded',
      },
    );
    expect(progressResponse?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: '읽기 포인트' }),
    ).toBeVisible();
  });

  test('브라우저 토큰이 있는 첫 렌더는 hydration 오류 없이 공개 홈을 전환한다', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const response = await page.goto('/home', {
      waitUntil: 'domcontentloaded',
    });

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: /뭐부터 해야 할지 모르겠죠/ }),
    ).toBeVisible();
    await expect(page.getByLabel('로그인 상태 확인 중')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('SPRINT7 리텐션: 미인증 경계', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of ['/streak', '/cohorts/1']) {
    test(`${path}는 익명 방문자를 인증 시작점으로 보낸다`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/$/, {
        timeout: 15_000,
      });
      await expect(page.getByText(/401|Unauthorized/i)).toHaveCount(0);
    });
  }

  test('세미나 QR 랜딩과 리텐션 인증 시작점은 익명에게 공개한다', async ({
    page,
  }) => {
    await page.goto('/seminar/e2e-retention', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: /오늘 만든 걸/ }),
    ).toBeVisible();

    await page.goto('/onboarding/retention?cohort=e2e-retention', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('button', { name: '카카오 로그인으로 시작하기' }),
    ).toBeVisible();
  });

  test('/home은 공개 랜딩과 로그인 시작점을 보여준다', async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', {
        name: /뭐부터 해야 할지 모르겠죠/,
      }),
    ).toBeVisible();
    // 헤더는 로그인 상태를 확인하는 동안 "로그인 상태 확인 중" 자리표시자를
    // 띄우고(home-header-client.tsx 의 isPublicAuthPending), 확인이 끝나야
    // 버튼을 그린다. CI 처럼 느린 환경에서는 그 확인이 기본 5초를 넘겨서
    // 자리표시자만 보고 죽는다(2026-08-25 CI 실측, 로컬은 통과).
    // 확인이 끝나는 것을 먼저 기다린 뒤 버튼을 본다.
    await expect(
      page.getByRole('status', { name: '로그인 상태 확인 중' }),
    ).toBeHidden({ timeout: 30_000 });
    await expect(
      page
        .getByRole('banner')
        .getByRole('button', { name: '로그인 / 회원가입' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: '내 방' })).toHaveCount(0);
  });
});
