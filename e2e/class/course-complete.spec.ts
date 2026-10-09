import { expect, type Page, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import type {
  CourseCompletionRecapResponse,
  CourseDetailResponse,
} from '../../src/types/api/course.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSE_ID = 1;
const AUTH_FILE = 'e2e/fixtures/auth.json';
const COMPLETE_PATH = '/class/vibe-intro/complete';
const PAID_HEADING = '축하합니다. 드디어 해내셨어요!';
const FREE_HEADING = '코스를 완주하셨어요!';

// ─── Global beforeEach: localhost auth cookie injection ───────────────────────

test.beforeEach(async ({ context, baseURL }) => {
  if (!existsSync(AUTH_FILE)) return;
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
  if (baseURL?.startsWith('http://localhost')) {
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

// ─── Mock Factories ───────────────────────────────────────────────────────────

function makeCourseDetail(): { content: CourseDetailResponse } {
  return {
    content: {
      courseId: COURSE_ID,
      slug: 'vibe-intro',
      viewerStatus: 'PAID',
      title: '바이브 코딩 인트로',
      description: null,
      thumbnailUrl: null,
      learnerCount: 42,
      durationDays: 30,
      completionCount: 0,
      exploringCount: 0,
      plans: [],
      earlyBirdEndsAt: null,
      canFreeEnroll: null,
      isFreeEnrolled: false,
      freeLessonCount: null,
      journeyMapAvailable: true,
      hasFullAccess: true,
      isPaidEnrolled: true,
      canPurchase: null,
    },
  };
}

function makeRecap(
  completionType: CourseCompletionRecapResponse['completionType'] = 'PAID',
): { content: CourseCompletionRecapResponse } {
  return {
    content: {
      completionType,
      latestCompletedLessonCount: 20,
      studyDays: 7,
      siteUrlCount: 3,
      completedAt: '2025-05-17T12:00:00.000Z',
      operatorMessage: null,
    },
  };
}

function makeFeedbackOptions() {
  return {
    content: {
      goodOptions: [{ optionId: 1, label: '강의 내용이 알찼어요' }],
      badOptions: [{ optionId: 11, label: '난이도가 높았어요' }],
    },
  };
}

// ─── Route Mock + Navigation ──────────────────────────────────────────────────

async function mockApis(
  page: Page,
  recap: { content: CourseCompletionRecapResponse } = makeRecap(),
): Promise<void> {
  await page.route(/\/courses\//, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (/\/courses\/\d+\/next-plan/.test(url) && method === 'POST') {
      await route.fulfill({ json: { content: null } });
    } else if (/\/courses\/\d+\/completion-recap/.test(url)) {
      await route.fulfill({ json: recap });
    } else if (/\/courses\/\d+\/feedback/.test(url) && method === 'GET') {
      // 무료 완주 설문(FreeCompletionSurvey)이 옵션을 불러오는 엔드포인트.
      await route.fulfill({ json: makeFeedbackOptions() });
    } else if (/\/courses\/\d+\/feedback/.test(url) && method === 'POST') {
      await route.fulfill({
        json: { content: { feedbackId: 1, couponCode: 'ALPHA-BATA-1000' } },
      });
    } else if (url.includes('/courses/vibe-intro')) {
      await route.fulfill({ json: makeCourseDetail() });
    } else {
      await route.continue();
    }
  });
}

async function gotoComplete(
  page: Page,
  recap: { content: CourseCompletionRecapResponse } = makeRecap(),
  heading: string = PAID_HEADING,
): Promise<void> {
  await mockApis(page, recap);
  // `waitUntil: 'load'` races Next's client-side soft-navigation: when the app
  // re-navigates during hydration the original document frame detaches and
  // goto throws `net::ERR_ABORTED; maybe frame was detached`. Use
  // `domcontentloaded` (settles before that window) and retry once if the
  // detach still wins. The rendered recap heading — not a network response
  // race — is the reliable readiness signal, since the mocks fulfill instantly.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(COMPLETE_PATH, { waitUntil: 'domcontentloaded' });
      break;
    } catch (error) {
      if (attempt === 1 || !String(error).includes('ERR_ABORTED')) throw error;
    }
  }
  await expect(page.getByText(heading)).toBeVisible({
    timeout: 15000,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('코스 완주 recap 렌더링 @auth', () => {
  test.beforeEach(async ({ page }) => {
    await gotoComplete(page);
  });

  test('"축하합니다. 드디어 해내셨어요!" 헤딩 표시', async ({ page }) => {
    await expect(page.getByText('축하합니다. 드디어 해내셨어요!')).toBeVisible({
      timeout: 5000,
    });
  });

  test('studyDays stat "7" 표시', async ({ page }) => {
    // studyDays appears in both the stat card and the message card
    await expect(page.getByText('7').first()).toBeVisible({ timeout: 5000 });
  });

  test('latestCompletedLessonCount "20" 표시', async ({ page }) => {
    await expect(page.getByText('20').first()).toBeVisible({ timeout: 5000 });
  });

  test('siteUrlCount "3" 표시', async ({ page }) => {
    await expect(page.getByText('3').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('CTA 내비게이션 @auth', () => {
  test.beforeEach(async ({ page }) => {
    await gotoComplete(page);
  });

  // 두 CTA 는 href 링크가 아니라 onClick(goWithFeedback: next-plan 제출 후 이동) 버튼이다.
  // 따라서 href 가 아닌 버튼 존재로 검증한다(실제 이동은 아래 "다음 계획 제출" 테스트가 커버).
  test('"빌더들의 바이브 보기" 버튼 표시', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: '빌더들의 바이브 보기' }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('"내 빌더 피드 모아보기" 버튼 표시', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: '내 빌더 피드 모아보기' }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('"건너뛰기" → /class', async ({ page }) => {
    const link = page.getByRole('link', { name: '건너뛰기' });
    await expect(link).toBeVisible({ timeout: 5000 });
    expect(await link.getAttribute('href')).toBe('/class');
  });
});

test.describe('다음 계획 제출 @auth', () => {
  test('textarea 입력 후 링크 클릭 → POST /courses/1/next-plan 호출', async ({
    page,
  }) => {
    await gotoComplete(page);

    await page.getByPlaceholder(/포트폴리오 사이트/).fill('AI 챗봇 만들어보기');

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/courses\/\d+\/next-plan/.test(r.url()) &&
          r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: '빌더들의 바이브 보기' }).click(),
    ]);

    expect(response.status()).toBe(200);
  });
});

test.describe('무료 체험 완주 설문 렌더링 @auth', () => {
  test.beforeEach(async ({ page }) => {
    // recap.completionType === 'FREE' → 무료 완주 설문(FreeCompletionSurvey) 분기
    await gotoComplete(page, makeRecap('FREE'), FREE_HEADING);
  });

  test('무료 완주 설문 헤딩 표시', async ({ page }) => {
    await expect(page.getByText(FREE_HEADING)).toBeVisible({ timeout: 5000 });
  });

  test('설문 필수 섹션(전체 만족도/추천/좋았던 점/아쉬웠던 점) 표시', async ({
    page,
  }) => {
    await expect(page.getByText('전체 만족도')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('이 코스를 추천하시겠어요?')).toBeVisible();
    await expect(page.getByText('가장 좋았던 점')).toBeVisible();
    await expect(page.getByText('가장 아쉬웠던 점')).toBeVisible();
  });

  test('유료 완주 헤딩은 노출되지 않음', async ({ page }) => {
    await expect(page.getByText(PAID_HEADING)).toHaveCount(0);
  });
});

// ─── FREE 설문 제출 → 시크릿 쿠폰 페이지 ────────────────────────────────────

async function fillSurveyAndSubmit(page: Page): Promise<void> {
  await page.getByRole('button', { name: '5점' }).click();
  await page.getByRole('button', { name: '9' }).click();
  await page.getByRole('button', { name: '강의 내용이 알찼어요' }).click();
  await page.getByRole('button', { name: '난이도가 높았어요' }).click();
  await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/courses\/\d+\/feedback/.test(r.url()) &&
        r.request().method() === 'POST',
    ),
    page.getByRole('button', { name: '피드백 제출하기' }).click(),
  ]);
}

test.describe('무료 완주 설문 제출 → 시크릿 쿠폰 페이지 @auth', () => {
  test.beforeEach(async ({ page }) => {
    await gotoComplete(page, makeRecap('FREE'), FREE_HEADING);
    await fillSurveyAndSubmit(page);
  });

  test('"소중한 의견 감사합니다." 헤딩으로 전환', async ({ page }) => {
    await expect(page.getByText('소중한 의견 감사합니다.')).toBeVisible({
      timeout: 5000,
    });
  });

  test('쿠폰 코드 ALPHA-BATA-1000 표시', async ({ page }) => {
    await expect(page.getByText('ALPHA-BATA-1000')).toBeVisible({
      timeout: 5000,
    });
  });

  test('"빌더들의 바이브 보기" Link → /class/vibe-intro/home?tab=feed', async ({
    page,
  }) => {
    const link = page.getByRole('link', { name: '빌더들의 바이브 보기' });
    await expect(link).toBeVisible({ timeout: 5000 });
    expect(await link.getAttribute('href')).toContain(
      '/class/vibe-intro/home?tab=feed',
    );
  });

  test('"내 빌더 피드 모아보기" Link → /my-page', async ({ page }) => {
    const link = page.getByRole('link', { name: '내 빌더 피드 모아보기' });
    await expect(link).toBeVisible({ timeout: 5000 });
    expect(await link.getAttribute('href')).toBe('/my-page');
  });
});
