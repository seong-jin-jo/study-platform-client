/** 담당 테스트 케이스: S7-SAVE-N01, S7-SAVE-E01, S7-SAVE-Z01, S7-SAVE-A01 */
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
const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
const SEARCH_QUERY = process.env.E2E_SPRINT7_SEARCH_QUERY ?? '배포';

test.use({ storageState: { cookies: [], origins: [] } });

interface ApiEnvelope<T> {
  content: T;
}

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
    `${API_BASE_URL}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
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
  await onboardingModal.getByRole('button', { name: '닫기' }).click();
  await modalCopy.waitFor({ state: 'hidden' });
}

async function apiJson<T>(
  request: APIRequestContext,
  path: string,
  options: { token?: string; expectedStatus?: number } = {},
): Promise<T> {
  const response = await request.get(`${API_BASE_URL}${path}`, {
    headers: options.token ? bearer(options.token) : undefined,
  });
  expect(response.status(), `GET ${path}`).toBe(options.expectedStatus ?? 200);
  const body = (await response.json()) as ApiEnvelope<T>;
  return body.content;
}

interface SavedItem {
  resourceType: 'COMMUNITY_POST' | 'INSIGHT_ARTICLE';
  resourceKey: string;
  title: string;
  destination?: string;
}

interface SavedPage {
  items: SavedItem[];
  nextCursor?: string;
}

interface SearchItem {
  type: SavedItem['resourceType'];
  resourceKey: string;
}

async function putSavedState(
  request: APIRequestContext,
  token: string,
  item: Pick<SavedItem, 'resourceType' | 'resourceKey'>,
  saved: boolean,
): Promise<void> {
  const response = await request.put(
    `${API_BASE_URL}/api/v1/saved-resources/${item.resourceType}/${encodeURIComponent(item.resourceKey)}`,
    { headers: bearer(token), data: { saved } },
  );
  if (response.status() !== 200) {
    throw new Error(
      `saved-resource mutation failed: type=${item.resourceType} key=${item.resourceKey} saved=${saved} status=${response.status()} body=${await response.text()}`,
    );
  }
  const body = await response.json();
  expect(body.content.saved).toBe(saved);
}

async function discoverMixedResources(
  request: APIRequestContext,
): Promise<Array<Pick<SavedItem, 'resourceType' | 'resourceKey'>>> {
  const search = await apiJson<{ items: SearchItem[] }>(
    request,
    `/api/v1/search?q=${encodeURIComponent(SEARCH_QUERY)}&size=50`,
  );
  const targets = (['COMMUNITY_POST', 'INSIGHT_ARTICLE'] as const).map(
    (resourceType) => {
      const item = search.items.find(
        (candidate) => candidate.type === resourceType,
      );
      return item ? { resourceType, resourceKey: item.resourceKey } : undefined;
    },
  );
  expect(
    targets,
    'mixed searchable resource fixtures are required',
  ).not.toContain(undefined);
  return targets as Array<Pick<SavedItem, 'resourceType' | 'resourceKey'>>;
}

async function listAllSavedResources(
  request: APIRequestContext,
  token: string,
): Promise<SavedItem[]> {
  const items: SavedItem[] = [];
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
    const page = await apiJson<SavedPage>(
      request,
      `/api/v1/saved-resources?size=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      { token },
    );
    items.push(...page.items);
    if (!page.nextCursor) return items;
    cursor = page.nextCursor;
  }
  throw new Error('saved resource cleanup exceeded 100 cursor pages');
}

test.describe('Sprint 7 V3 saved resources @responsive', () => {
  test('desired state is idempotent and the mixed cursor list has no duplicates', async ({
    request,
  }) => {
    const token = await mintMemberToken(request);
    const mixedResources = await discoverMixedResources(request);
    for (const resource of mixedResources) {
      await putSavedState(request, token, resource, true);
    }
    const first = await apiJson<SavedPage>(
      request,
      '/api/v1/saved-resources?size=2',
      { token },
    );
    expect(first.items.length).toBeGreaterThan(0);

    const target = first.items[0];
    for (const saved of [true, true, false, false, true]) {
      await putSavedState(request, token, target, saved);
    }

    const pages = [first];
    if (first.nextCursor) {
      pages.push(
        await apiJson<SavedPage>(
          request,
          `/api/v1/saved-resources?size=2&cursor=${encodeURIComponent(first.nextCursor)}`,
          { token },
        ),
      );
    }
    const keys = pages.flatMap((page) =>
      page.items.map((item) => `${item.resourceType}:${item.resourceKey}`),
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(first.items.map((item) => item.resourceType)).size).toBe(2);
  });

  test('failed mutation rolls the optimistic state back without a fake success', async ({
    page,
    request,
  }) => {
    await authenticatePage(page, request);
    const feedResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/home/feed' &&
        response.request().method() === 'GET',
    );
    await page.goto('/');
    expect((await feedResponse).status()).toBe(200);
    await dismissOnboardingModalIfPresent(page);
    const saveButton = page.locator('[data-testid^="save-resource-"]').first();
    await expect(saveButton).toBeVisible();
    const before = await saveButton.getAttribute('aria-pressed');

    await page.route('**/api/v1/saved-resources/**', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          json: { message: 'controlled failure' },
        });
      } else {
        await route.continue();
      }
    });
    await saveButton.click();
    await expect(
      page.getByText('저장 상태를 바꾸지 못했어요. 다시 눌러 주세요.'),
    ).toBeVisible();
    await expect(saveButton).toHaveAttribute('aria-pressed', before ?? 'false');
  });

  test('empty member sees one actionable empty state', async ({
    page,
    request,
  }) => {
    const memberId = requiredMemberId('E2E_SPRINT7_EMPTY_MEMBER_ID');
    const token = await mintMemberToken(request, memberId);
    const existing = await listAllSavedResources(request, token);
    for (const item of existing) {
      await putSavedState(request, token, item, false);
    }
    await authenticatePage(page, request, memberId);
    await page.goto('/saved-posts');
    await dismissOnboardingModalIfPresent(page);
    await expect(page.getByText('저장한 글이 아직 없어요')).toBeVisible();
    await expect(
      page.getByRole('link', { name: '글 보러 가기' }),
    ).toHaveAttribute('href', '/');
  });

  test('guest cannot read saved data and never sees a raw 401 page', async ({
    page,
    request,
  }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/v1/saved-resources`,
    );
    expect([401, 403]).toContain(response.status());

    await page.context().clearCookies();
    await page.goto('/saved-posts');
    await expect(page.getByText(/^401$/)).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(/^401\b/m);
  });
});
