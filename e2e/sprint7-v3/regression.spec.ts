/** 담당 테스트 케이스: S7-REG-01, S7-REG-02, S7-REG-03, S7-REG-04 */
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

const FRONTEND_ORIGIN =
  process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_ORIGIN =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

test.use({ storageState: { cookies: [], origins: [] } });
const SEARCH_QUERY = process.env.E2E_SPRINT7_SEARCH_QUERY ?? '배포';

interface ApiEnvelope<T> {
  content: T;
}

type JsonRecord = Record<string, unknown>;

function requiredMemberId(): number {
  const value = Number(process.env.E2E_SPRINT7_MEMBER_ID?.trim());
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      'E2E_SPRINT7_MEMBER_ID is required and must be a positive integer',
    );
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
): Promise<string> {
  const token = await mintMemberToken(request);
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

function unwrapContent(value: unknown): JsonRecord {
  expect(value).toBeTruthy();
  expect(typeof value).toBe('object');
  const content = (value as JsonRecord).content;
  expect(content).toBeTruthy();
  expect(typeof content).toBe('object');
  return content as JsonRecord;
}

test.describe('Sprint 7 V3 고정 회귀 @responsive', () => {
  test('회장 호평 3종 문구를 모두 유지한다', async ({ page, request }) => {
    const token = await authenticatePage(page, request);
    const hotFeedResponse = await request.get(
      `${API_ORIGIN}/api/v1/home/feed`,
      {
        headers: bearer(token),
        params: { sort: 'HOT', size: 20 },
      },
    );
    expect(hotFeedResponse.status()).toBe(200);
    const hotFeed = unwrapContent(await hotFeedResponse.json());
    const discoveryFeed = hotFeed.discoveryFeed as JsonRecord;
    const hotItems = discoveryFeed.items as JsonRecord[];
    expect(Array.isArray(hotItems)).toBe(true);
    const answeredPost = hotItems.find((item) => {
      const stats = item.stats as JsonRecord | undefined;
      return item.type === 'COMMUNITY_POST' && Number(stats?.commentCount) > 0;
    });
    expect(
      answeredPost,
      'HOT feed must include a community post with an actual answer',
    ).toBeTruthy();
    const answeredPostTitle = String(answeredPost?.title);

    const feedResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/home/feed' &&
        response.request().method() === 'GET',
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect((await feedResponse).status()).toBe(200);

    // SPRINT7 V3 QA 수정: 기본(NEW) 정렬 첫 화면은 최신순이라 답글 달린 글이
    // 첫 화면에 우연히 없을 수 있다(2026-08-08 실측: 20건 중 답글 있는 글 0건).
    // "답변 달리는 중"은 답글이 있는 글에서만 렌더되는 조건부 문구이므로,
    // 페이지 전역 검사는 답글이 있는 글이 실제로 존재함을 보장하는
    // HOT(많이 도움된 글) 정렬로 전환한 뒤 수행해야 성립한다.
    // (SPRINT8에서 이 검사를 기본 정렬 위에 얹으면서 전제가 깨졌던 회귀.)
    const sortedFeedResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/v1/home/feed' &&
        url.searchParams.get('sort') === 'HOT' &&
        response.request().method() === 'GET'
      );
    });
    await page.getByRole('button', { name: '많이 도움된 글' }).click();
    expect((await sortedFeedResponse).status()).toBe(200);

    // HOT 정렬 전환 후: 답글이 있는 글이 화면에 존재하는 상태에서
    // 3종 문구가 페이지 전역에 노출되는지 먼저 확인한다(SPRINT8 회귀 의도 유지).
    await expect(page.getByText('답변 달리는 중').first()).toBeVisible();
    await expect(page.getByText(/\d+명이 다녀갔어요/).first()).toBeVisible();

    // API로 실제 답변이 달린 글을 특정해 그 카드 안에서 3종 문구가 함께 뜨는지 확정 검증한다.
    const answeredPostCard = page
      .getByTestId('home-feed-card')
      .filter({ hasText: answeredPostTitle })
      .first();
    await expect(answeredPostCard.getByText('답변 달리는 중')).toBeVisible();
    await expect(
      answeredPostCard.getByText(/\d+명이 다녀갔어요/),
    ).toBeVisible();
    await expect(
      answeredPostCard.getByText('최근 같은 방 멤버가 답을 보고 있어요'),
    ).toBeVisible();
  });

  test('로그인과 기존 주요 서비스 route가 raw 401 없이 열린다', async ({
    page,
    request,
  }) => {
    await authenticatePage(page, request);
    for (const path of [
      '/',
      '/community',
      '/insights',
      '/group-study',
      '/my-class',
      '/support',
    ]) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), path).toBeLessThan(500);
      await expect(page.getByText(/401|Unauthorized/i), path).toHaveCount(0);
    }
  });

  test('커뮤니티 글과 인사이트 조회 계약이 실제 데이터를 반환한다', async ({
    request,
  }) => {
    const search = await request.get(`${API_ORIGIN}/api/v1/search`, {
      params: { q: SEARCH_QUERY, size: 50 },
      headers: bearer(await mintMemberToken(request)),
    });
    expect(search.status()).toBe(200);
    const items = (unwrapContent(await search.json()).items ?? []) as Array<
      Record<string, unknown>
    >;
    const community = items.find((item) => item.type === 'COMMUNITY_POST');
    const insight = items.find((item) => item.type === 'INSIGHT_ARTICLE');
    expect(community).toBeTruthy();
    expect(insight).toBeTruthy();

    const communityPage = await request.get(
      `${FRONTEND_ORIGIN}${String(community?.destination)}`,
    );
    const insightPage = await request.get(
      `${FRONTEND_ORIGIN}${String(insight?.destination)}`,
    );
    expect(communityPage.status()).toBe(200);
    expect(insightPage.status()).toBe(200);
  });

  test('기존 알림 목록의 filter, read, delete API surface가 유지된다', async ({
    request,
  }) => {
    const headers = bearer(await mintMemberToken(request));
    const list = await request.get(`${API_ORIGIN}/api/v1/notifications`, {
      headers,
      params: { page: 1, size: 10, hasRead: false },
    });
    const categories = await request.get(
      `${API_ORIGIN}/api/v1/notifications/categories`,
      { headers },
    );
    const hasNew = await request.get(
      `${API_ORIGIN}/api/v1/notifications/has-new`,
      { headers },
    );
    expect(list.status()).toBe(200);
    expect(categories.status()).toBe(200);
    expect(hasNew.status()).toBe(200);
  });
});
