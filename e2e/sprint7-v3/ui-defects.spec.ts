/** 담당 테스트 케이스: S7-UI-N01, S7-UI-E01, S7-UI-Z01, S7-UI-A01 */
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

const FRONTEND_ORIGIN =
  process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_ORIGIN =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
const SEARCH_QUERY = process.env.E2E_SPRINT7_SEARCH_QUERY ?? '배포';

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
  const target = new URL(FRONTEND_ORIGIN);
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

function itemsOf(content: JsonRecord): JsonRecord[] {
  const items = content.items;
  expect(Array.isArray(items)).toBe(true);
  return items as JsonRecord[];
}

interface SavedItem {
  resourceType: 'COMMUNITY_POST' | 'INSIGHT_ARTICLE';
  resourceKey: string;
}

interface SavedPage {
  items: SavedItem[];
  nextCursor?: string;
}

async function clearSavedResources(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
    const list = await request.get(`${API_ORIGIN}/api/v1/saved-resources`, {
      headers: bearer(token),
      params: { size: 50, ...(cursor ? { cursor } : {}) },
    });
    expect(list.status(), 'empty-state saved-resource list').toBe(200);
    const page = unwrapContent(await list.json()) as unknown as SavedPage;
    for (const item of page.items) {
      const mutation = await request.put(
        `${API_ORIGIN}/api/v1/saved-resources/${item.resourceType}/${encodeURIComponent(item.resourceKey)}`,
        { headers: bearer(token), data: { saved: false } },
      );
      if (mutation.status() !== 200) {
        throw new Error(
          `empty-state cleanup failed: type=${item.resourceType} key=${item.resourceKey} status=${mutation.status()} body=${await mutation.text()}`,
        );
      }
    }
    if (!page.nextCursor) return;
    cursor = page.nextCursor;
  }
  throw new Error('empty-state cleanup exceeded 100 cursor pages');
}

async function findSearchItems(request: APIRequestContext): Promise<{
  community: JsonRecord;
  insight: JsonRecord;
}> {
  const response = await request.get(`${API_ORIGIN}/api/v1/search`, {
    params: { q: SEARCH_QUERY, size: 50 },
  });
  expect(response.status()).toBe(200);
  const items = itemsOf(unwrapContent(await response.json()));
  const community = items.find((item) => item.type === 'COMMUNITY_POST');
  const insight = items.find((item) => item.type === 'INSIGHT_ARTICLE');
  expect(
    community,
    `community result missing for query: ${SEARCH_QUERY}`,
  ).toBeTruthy();
  expect(
    insight,
    `insight result missing for query: ${SEARCH_QUERY}`,
  ).toBeTruthy();
  return { community: community as JsonRecord, insight: insight as JsonRecord };
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Sprint 7 V3 화면 결함 회귀 @responsive', () => {
  test('정상: 글 돌아가기, 내 방 분리, 무한스크롤, 마이페이지, 알림 종을 유지한다', async ({
    page,
    request,
  }) => {
    await authenticatePage(page, request);
    await findSearchItems(request);
    const gatedPostId = requiredMemberId('E2E_SPRINT7_GATED_POST_ID');
    await page.goto(`/community/${gatedPostId}`, {
      waitUntil: 'domcontentloaded',
    });
    await dismissOnboardingModalIfPresent(page);
    const back = page.locator('.zeroone-post-back-link');
    await expect(back).toHaveAttribute('href', /^\/community\/rooms\/\d+$/);

    await page.goto('/community', { waitUntil: 'domcontentloaded' });
    await dismissOnboardingModalIfPresent(page);
    await expect(page.getByText(/입장한 방 \d+\/3/)).toBeVisible();
    await expect(page.getByText('아직 정착하지 않은 방')).toBeVisible();

    const feedResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/home/feed' &&
        response.request().method() === 'GET',
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect((await feedResponse).status()).toBe(200);
    await dismissOnboardingModalIfPresent(page);
    const firstPageCount = await page.getByTestId('home-feed-card').count();
    const loadMore = page.getByTestId('home-feed-load-more');
    if (await loadMore.isVisible()) {
      await loadMore.scrollIntoViewIfNeeded();
      await expect
        .poll(() => page.getByTestId('home-feed-card').count())
        .toBeGreaterThan(firstPageCount);
    }
    await expect(
      page.getByRole('button', {
        name: /^(?:읽지 않은 )?알림(?: \d+개)?$/,
      }),
    ).toBeVisible();

    await page.goto('/my-page', { waitUntil: 'domcontentloaded' });
    await dismissOnboardingModalIfPresent(page);
    await expect(page.getByRole('heading', { name: '프로필' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: '저장한 글', exact: true }),
    ).toBeVisible();
  });

  test('예외: 방 3개 회원의 네 번째 입장은 교체 모달에서 선택 전 확정 불가다', async ({
    page,
    request,
  }) => {
    await authenticatePage(
      page,
      request,
      requiredMemberId('E2E_SPRINT7_THREE_ROOM_MEMBER_ID'),
    );
    await page.goto('/community', { waitUntil: 'domcontentloaded' });
    await dismissOnboardingModalIfPresent(page);
    await expect(page.getByTestId('community-room-error')).toHaveCount(0);
    await expect(page.getByTestId('community-room-active-counter')).toHaveText(
      '입장한 방 3/3',
      { timeout: 15_000 },
    );
    await page.locator('[data-testid^="community-room-join-"]').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/교체|나갈 방|3개/);
    const confirm = dialog.getByRole('button', {
      name: '바꿀 방을 먼저 골라 주세요',
      exact: true,
    });
    await expect(confirm).toBeDisabled();
  });

  test('빈 상태: 신규 회원의 홈, 커뮤니티, 마이페이지가 다음 행동을 제공한다', async ({
    page,
    request,
  }) => {
    const memberId = requiredMemberId('E2E_SPRINT7_EMPTY_MEMBER_ID');
    const token = await authenticatePage(page, request, memberId);
    await clearSavedResources(request, token);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dismissOnboardingModalIfPresent(page);
    await expect(page.getByText(/아직 입장한 방이 없어요/)).toBeVisible();
    await page.goto('/community', { waitUntil: 'domcontentloaded' });
    await dismissOnboardingModalIfPresent(page);
    await expect(page.getByTestId('community-room-hub')).toBeVisible();
    await page.goto('/saved-posts', { waitUntil: 'domcontentloaded' });
    await dismissOnboardingModalIfPresent(page);
    await expect(
      page.getByRole('link', { name: '글 보러 가기' }),
    ).toBeVisible();
  });

  test('권한 없음: 비회원은 보호 화면에서 raw 401 대신 인증 시작점으로 이동한다', async ({
    page,
  }) => {
    await page.context().clearCookies();
    for (const path of ['/saved-posts', '/my-page', '/notification']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/401|Unauthorized/i)).toHaveCount(0);
      await expect.poll(() => new URL(page.url()).pathname).toBe('/');
      await expect(
        page.getByRole('button', { name: '로그인 / 회원가입' }).first(),
      ).toBeVisible();
    }
  });

  test('검색어 종료 후에도 홈 뼈대가 유지된다', async ({ page, request }) => {
    await authenticatePage(page, request);
    const searchResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/search' &&
        response.request().method() === 'GET',
    );
    await page.goto(`/search?q=${encodeURIComponent(SEARCH_QUERY)}`, {
      waitUntil: 'domcontentloaded',
    });
    expect((await searchResponse).status()).toBe(200);
    await dismissOnboardingModalIfPresent(page);
    await expect(page.getByTestId('search-result-card').first()).toBeVisible();
    await expect(page.getByText('내 활동')).toBeVisible();
  });
});
