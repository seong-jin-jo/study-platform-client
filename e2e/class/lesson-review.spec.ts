import { expect, type Page, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import type {
  CourseDrawerResponse,
  LessonDetailResponse,
  LessonRetrospectiveCreateResponse,
} from '../../src/types/api/course.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSE_ID = 1;
const LESSON_ID = 101;
const AUTH_FILE = 'e2e/fixtures/auth.json';

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

function makeDrawer(): { content: CourseDrawerResponse } {
  return {
    content: {
      courseId: COURSE_ID,
      courseTitle: '바이브 코딩 인트로',
      chapters: [
        {
          chapterId: 10,
          order: 1,
          title: '시작하기',
          description: null,
          isDefaultExpanded: true,
          lessons: [
            {
              lessonId: LESSON_ID,
              order: 1,
              title: '기초 세팅',
              isFree: true,
              isLocked: false,
              status: 'IN_PROGRESS',
              isCurrentLesson: true,
            },
            {
              lessonId: LESSON_ID + 1,
              order: 2,
              title: '다음 레슨',
              isFree: true,
              isLocked: true,
              status: 'LOCKED',
              isCurrentLesson: false,
            },
          ],
        },
      ],
    },
  };
}

function makeLesson(overrides: Partial<LessonDetailResponse> = {}): {
  content: LessonDetailResponse;
} {
  const content: LessonDetailResponse = {
    lessonId: LESSON_ID,
    courseId: COURSE_ID,
    courseSlug: 'vibe-intro',
    courseTitle: '바이브 코딩 인트로',
    chapterNumber: 1,
    lessonNumber: 1,
    title: '기초 세팅',
    description: null,
    isFree: true,
    estimatedMinutes: 18,
    videoUrl: null,
    learnerCount: 10,
    viewCount: 0,
    retrospectivePurpose: 'PRACTICE_PROOF',
    retrospectivePrompt: '',
    artifactSubmissionRequired: false,
    contentMarkdown: '',
    progressStatus: 'IN_PROGRESS',
    retrospectiveSubmitted: false,
    ...overrides,
  };

  return {
    content,
  };
}

function makeRetroResponse(
  isCourseCompleted = false,
  courseCompletionType: LessonRetrospectiveCreateResponse['courseCompletionType'] = isCourseCompleted
    ? 'PAID'
    : null,
): {
  content: LessonRetrospectiveCreateResponse;
} {
  return {
    content: {
      retrospectiveId: 1,
      feedId: 1,
      isLessonCompleted: true,
      // 무료 완주(FREE)는 isCourseCompleted=false 이지만 마지막 무료 레슨이라 다음 레슨이 없다.
      nextAccessibleLessonId:
        isCourseCompleted || courseCompletionType === 'FREE' ? null : 102,
      isCourseCompleted,
      courseCompletionType,
    },
  };
}

// ─── Route Mock + Navigation ──────────────────────────────────────────────────

async function mockAndNavigate(
  page: Page,
  lessonOverrides: Partial<LessonDetailResponse> = {},
  retroResponse: {
    content: LessonRetrospectiveCreateResponse;
  } = makeRetroResponse(false),
): Promise<void> {
  await page.route(/\/courses\//, async (route) => {
    const url = route.request().url();
    if (/\/courses\/\d+\/drawer/.test(url)) {
      await route.fulfill({ json: makeDrawer() });
    } else if (url.includes('/courses/vibe-intro')) {
      await route.fulfill({
        json: {
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
        },
      });
    } else {
      await route.continue();
    }
  });

  await page.route(/\/lessons\//, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (/\/lessons\/\d+\/retrospective/.test(url) && method === 'POST') {
      await route.fulfill({ json: retroResponse });
    } else if (/\/lessons\/\d+$/.test(url)) {
      await route.fulfill({ json: makeLesson(lessonOverrides) });
    } else {
      // qnas/sidebar, builder-feeds/preview — return empty
      await route.fulfill({ json: { content: null } });
    }
  });

  await Promise.all([
    page.waitForResponse((r) => /\/courses\/\d+\/drawer/.test(r.url())),
    page.goto(`/class/vibe-intro/lesson/${LESSON_ID}`, { waitUntil: 'load' }),
  ]);
}

// Fills all required form fields for a valid submission
async function fillReviewForm(page: Page) {
  // Star rating (aria-label from the shared StarRatingInput)
  await page.getByRole('button', { name: '3점' }).click();

  // 회고 — 두 질문을 하나로 합친 단일 MarkdownEditor(tiptap, contenteditable).
  // (lesson-review-form QuestionBlock, REVIEW_PLACEHOLDER 참고)
  const editor = page.locator('.tiptap-editor [contenteditable]').first();
  await editor.click();
  await page.keyboard.type('신기한 코드');

  // Chips — PRACTICAL/THEORY 에선 선택사항(검증 무관), OTHER 에서만 필수.
  await page.getByRole('button', { name: '설명이 이해하기 쉬웠어요' }).click();
  await page.getByRole('button', { name: '실습이 재밌었어요' }).click();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('레슨 돌아보기 폼 렌더링 @auth', () => {
  test.beforeEach(async ({ page }) => {
    await mockAndNavigate(page);
    // Drawer auto-opens for 2s on mount; wait for it to close
    await expect(
      page.getByRole('button', { name: '커리큘럼 닫기' }).first(),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('"레슨 돌아보기" 섹션 헤딩 표시', async ({ page }) => {
    await expect(page.getByText('레슨 돌아보기').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('별점 버튼 5개 표시', async ({ page }) => {
    for (const n of [1, 2, 3, 4, 5]) {
      await expect(page.getByRole('button', { name: `${n}점` })).toBeVisible();
    }
  });

  test('회고 마크다운 에디터 표시', async ({ page }) => {
    await expect(
      page.locator('.tiptap-editor [contenteditable]').first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('칩 6개 전체 표시', async ({ page }) => {
    for (const chip of [
      '설명이 이해하기 쉬웠어요',
      '실습이 재밌었어요',
      '만들어졌다는 게 신기했어요',
      '실습이 막혔어요',
      '설명이 어려웠어요',
      '뭘 하는 건지 모르겠어요',
    ]) {
      await expect(page.getByRole('button', { name: chip })).toBeVisible();
    }
  });

  test('초기 상태 — 제출 버튼 비활성화', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: '제출하고 다음 Lesson 하러 가기' }),
    ).toBeDisabled();
  });
});

test.describe('이미 제출 상태 @auth', () => {
  test('버튼 "이미 제출했어요" + 비활성화', async ({ page }) => {
    await mockAndNavigate(page, { retrospectiveSubmitted: true });
    await expect(
      page.getByRole('button', { name: '이미 제출했어요' }),
    ).toBeDisabled({ timeout: 5000 });
  });
});

test.describe('제출 버튼 활성화 조건 @auth', () => {
  test.beforeEach(async ({ page }) => {
    await mockAndNavigate(page);
    await expect(
      page.getByRole('button', { name: '커리큘럼 닫기' }).first(),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('모든 필드 입력 → 버튼 활성화', async ({ page }) => {
    await fillReviewForm(page);
    await expect(
      page.getByRole('button', { name: '제출하고 다음 Lesson 하러 가기' }),
    ).not.toBeDisabled({ timeout: 3000 });
  });

  test('별점만 선택, 회고 미입력 → 버튼 여전히 비활성화', async ({ page }) => {
    // PRACTICAL 레슨은 별점 + 회고 본문이 모두 채워져야 활성화된다
    // (requiresQuestionAnswers). 회고를 비워두면 submitDisabled 가 유지된다.
    await page.getByRole('button', { name: '3점' }).click();
    await expect(
      page.getByRole('button', { name: '제출하고 다음 Lesson 하러 가기' }),
    ).toBeDisabled();
  });
});

test.describe('OTHER 레슨 피드백 필수 @auth', () => {
  // OTHER purpose 는 회고 에디터가 없고 피드백(칩 ≥2 또는 자유 텍스트)이 필수다.
  test.beforeEach(async ({ page }) => {
    await mockAndNavigate(page, { retrospectivePurpose: 'OTHER' });
    await expect(
      page.getByRole('button', { name: '커리큘럼 닫기' }).first(),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('칩 1개만 선택 → 버튼 여전히 비활성화', async ({ page }) => {
    await page.getByRole('button', { name: '3점' }).click();
    await page
      .getByRole('button', { name: '설명이 이해하기 쉬웠어요' })
      .click();
    // 칩 1개(<2)·자유 텍스트 없음 → hasFeedback=false → submitDisabled 유지
    await expect(
      page.getByRole('button', { name: '제출하고 다음 Lesson 하러 가기' }),
    ).toBeDisabled();
  });

  test('칩 2개 선택 → 버튼 활성화', async ({ page }) => {
    await page.getByRole('button', { name: '3점' }).click();
    await page
      .getByRole('button', { name: '설명이 이해하기 쉬웠어요' })
      .click();
    await page.getByRole('button', { name: '실습이 재밌었어요' }).click();
    await expect(
      page.getByRole('button', { name: '제출하고 다음 Lesson 하러 가기' }),
    ).not.toBeDisabled({ timeout: 3000 });
  });
});

test.describe('제출 성공 흐름 @auth', () => {
  test('isCourseCompleted: false → /class/vibe-intro/home 이동', async ({
    page,
  }) => {
    await mockAndNavigate(page, {}, makeRetroResponse(false));
    await expect(
      page.getByRole('button', { name: '커리큘럼 닫기' }).first(),
    ).not.toBeVisible({ timeout: 5000 });

    await fillReviewForm(page);

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/lessons\/\d+\/retrospective/.test(r.url()) &&
          r.request().method() === 'POST',
      ),
      page
        .getByRole('button', { name: '제출하고 다음 Lesson 하러 가기' })
        .click(),
    ]);

    expect(response.status()).toBe(200);
    await expect(page.getByText('제출이 완료되었어요!')).toBeVisible({
      timeout: 5000,
    });
    await page.waitForURL('**/class/vibe-intro/home', { timeout: 5000 });
  });

  test('isCourseCompleted: true (유료 완주) → /class/vibe-intro/complete 이동', async ({
    page,
  }) => {
    await mockAndNavigate(page, {}, makeRetroResponse(true));
    await expect(
      page.getByRole('button', { name: '커리큘럼 닫기' }).first(),
    ).not.toBeVisible({ timeout: 5000 });

    await fillReviewForm(page);

    await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/lessons\/\d+\/retrospective/.test(r.url()) &&
          r.request().method() === 'POST',
      ),
      page
        .getByRole('button', { name: '제출하고 다음 Lesson 하러 가기' })
        .click(),
    ]);

    await page.waitForURL('**/class/vibe-intro/complete', { timeout: 5000 });
  });

  test('courseCompletionType: FREE (무료 체험 완주) → /class/vibe-intro/complete 이동', async ({
    page,
  }) => {
    // 마지막 무료 레슨 회고 제출 → FREE 완주 타입 → 완주(설문) 페이지로 이동
    await mockAndNavigate(page, {}, makeRetroResponse(false, 'FREE'));
    await expect(
      page.getByRole('button', { name: '커리큘럼 닫기' }).first(),
    ).not.toBeVisible({ timeout: 5000 });

    await fillReviewForm(page);

    await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/lessons\/\d+\/retrospective/.test(r.url()) &&
          r.request().method() === 'POST',
      ),
      page
        .getByRole('button', { name: '제출하고 다음 Lesson 하러 가기' })
        .click(),
    ]);

    await page.waitForURL('**/class/vibe-intro/complete', { timeout: 5000 });
  });
});

test.describe('artifactSubmissionRequired @auth', () => {
  test('"오늘의 프로젝트 완성 알리기" 섹션 + "스크린샷 첨부" 버튼 표시', async ({
    page,
  }) => {
    await mockAndNavigate(page, { artifactSubmissionRequired: true });
    await expect(
      page.getByRole('button', { name: '커리큘럼 닫기' }).first(),
    ).not.toBeVisible({ timeout: 5000 });

    await expect(page.getByText('오늘의 프로젝트 완성 알리기')).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByRole('button', { name: '스크린샷 첨부' }),
    ).toBeVisible();
  });

  test('이미지 미첨부 상태 — 나머지 다 입력해도 버튼 비활성화', async ({
    page,
  }) => {
    await mockAndNavigate(page, { artifactSubmissionRequired: true });
    await expect(
      page.getByRole('button', { name: '커리큘럼 닫기' }).first(),
    ).not.toBeVisible({ timeout: 5000 });

    await fillReviewForm(page);
    // artifactImageUrl is still null — isFormValid is false
    await expect(
      page.getByRole('button', { name: '제출하고 다음 Lesson 하러 가기' }),
    ).toBeDisabled();
  });
});
