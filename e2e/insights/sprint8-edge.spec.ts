import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from '@playwright/test';

const WEB_BASE_URL = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
const FORBIDDEN_BODY_KEYS = [
  'body',
  'bodyHtml',
  'blocks',
  'content',
  'contentHtml',
  'file',
  'files',
  'media',
  'inlineMedia',
  'richText',
  'attachments',
] as const;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  // 식별자가 없는 것은 **제품 결함이 아니라 검증 전제가 안 갖춰진 것**이다.
  // 예전에는 여기서 throw 해서 실패로 잡혔고, 그 실패가 진짜 결함과 같은 칸에
  // 섞여 34건 중 무엇이 결함인지 구분이 안 됐다(2026-08-21).
  // qa-plan-sprint8-v1.0.0.md §2 규칙대로 **미실시(사유)** 로 남긴다.
  // 통과로 올리는 것이 아니라, 안 돌았다는 사실과 이유를 그대로 드러낸다.
  test.skip(
    !value,
    `${name} 미설정이라 이 케이스는 실행할 수 없다(미실시). ` +
      '값 정본은 e2e/sprint8-identifiers.env 이고, 아직 못 채운 값은 그 파일 하단에 사유와 함께 적혀 있다.',
  );
  return value as string;
}

function requiredNumber(name: string, fallback?: number): number {
  const raw = process.env[name]?.trim() ?? String(fallback ?? '');
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

async function mintMemberToken(
  request: APIRequestContext,
  memberId: number,
): Promise<string> {
  const response = await request.get(
    `${API_BASE_URL}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
  );
  expect(response.status(), `token mint for member ${memberId}`).toBe(200);
  const envelope = (await response.json()) as {
    content?: { accessToken?: string };
  };
  expect(envelope.content?.accessToken).toBeTruthy();
  return String(envelope.content?.accessToken);
}

async function authenticate(
  page: Page,
  request: APIRequestContext,
  memberId: number,
): Promise<void> {
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
}

function collectForbiddenPaths(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenPaths(item, `${path}[${index}]`),
    );
  }
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    const baseResponseEnvelope = path === '$' && key === 'content';
    const own =
      !baseResponseEnvelope &&
      FORBIDDEN_BODY_KEYS.includes(key as (typeof FORBIDDEN_BODY_KEYS)[number])
        ? [childPath]
        : [];
    return [...own, ...collectForbiddenPaths(child, childPath)];
  });
}

/**
 * 있으면 쓰고 없으면 그 단언만 건너뛰는 값.
 *
 * requiredEnv 는 값이 없으면 **테스트 전체를** 미실시로 만든다. dev 실데이터에서 못 뽑는
 * 값 하나 때문에 나머지 단언까지 통째로 안 도는 일이 있었다(2026-08-26 실측).
 * 본문 문자열이 실제로 있어야 성립하는 단언은 픽스처 CMS 를 띄우고 도는 묶음이 맡는다
 * (sprint8.spec.ts 의 본문 검사, sprint8-seo-public.spec.ts 의 LOCKED_CANARY_9f31 비유출).
 * 여기서는 dev 로 확인 가능한 것을 계속 돌리고, 그 값이 있을 때만 단언을 더한다.
 */
function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function expectNoLeak(surface: string, payload: string, canary?: string) {
  if (canary) {
    expect(payload, `${surface} leaked locked canary`).not.toContain(canary);
  }
  const forbiddenFragment =
    process.env.E2E_SPRINT8_LOCKED_BODY_FRAGMENT?.trim();
  if (forbiddenFragment) {
    expect(payload, `${surface} leaked locked body fragment`).not.toContain(
      forbiddenFragment,
    );
  }
}

test.describe('SPRINT8 P0 edge', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-S8-EDGE-001 비회원 첫 편 전문 뒤 두 번째 편에서만 로그인 전환', async ({
    page,
  }) => {
    const firstSlug = requiredEnv('E2E_SPRINT8_FIRST_SLUG');
    const firstTitle = requiredEnv('E2E_SPRINT8_FIRST_TITLE');
    const firstEndCta = optionalEnv('E2E_SPRINT8_FIRST_END_CTA');
    const islandSlug = requiredEnv('E2E_SPRINT8_FIRST_ISLAND_SLUG');
    const secondSlug = requiredEnv('E2E_SPRINT8_SECOND_SLUG');

    await page.goto(`/insights/${firstSlug}`);
    await expect(
      page.getByRole('heading', { name: firstTitle, exact: true }),
    ).toBeVisible();
    if (firstEndCta) {
      await expect(page.getByText(firstEndCta, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(/401|Unauthorized/i)).toHaveCount(0);

    await page.goto(`/insights/land/${islandSlug}`);
    await page.getByTestId(`article-${secondSlug}`).click();
    await expect(page).toHaveURL(/\/login(?:[?#]|$)/);
  });

  test('TC-S8-EDGE-002 잠긴 편 직접 접근 시 HTML·RSC·JSON·DOM 본문 비유출', async ({
    page,
    request,
  }) => {
    const slug = requiredEnv('E2E_SPRINT8_LOCKED_SLUG');
    const title = requiredEnv('E2E_SPRINT8_LOCKED_TITLE');
    const canary = optionalEnv('E2E_SPRINT8_LOCKED_CANARY');
    const islandId = requiredNumber('E2E_SPRINT8_LOCKED_ISLAND_ID');
    const pageUrl = `${WEB_BASE_URL}/insights/${encodeURIComponent(slug)}`;
    const surfaces = [
      ['HTML', pageUrl, {}],
      ['RSC', pageUrl, { RSC: '1', 'Next-Router-Prefetch': '1' }],
    ] as const;

    for (const [name, url, headers] of surfaces) {
      const response = await request.get(url, { headers });
      expect(response.status(), `${name} status`).toBe(200);
      expectNoLeak(name, await response.text(), canary);
    }

    const jsonSurfaces = [
      [
        'access JSON',
        `${API_BASE_URL}/api/v1/insight/articles/by-slug/${encodeURIComponent(slug)}/access`,
        true,
      ],
      ['map JSON', `${API_BASE_URL}/api/v1/insight/map`, false],
      [
        'island JSON',
        `${API_BASE_URL}/api/v1/insight/islands/${islandId}`,
        false,
      ],
    ] as const;

    for (const [name, url, isAccess] of jsonSurfaces) {
      const response = await request.get(url);
      expect(response.status(), `${name} status`).toBe(200);
      const text = await response.text();
      expectNoLeak(name, text, canary);
      const payload = JSON.parse(text) as unknown;
      expect(
        collectForbiddenPaths(payload),
        `${name} forbidden key paths`,
      ).toEqual([]);
      if (isAccess) {
        const cacheControl = response.headers()['cache-control'] ?? '';
        expect(cacheControl).toContain('private');
        expect(cacheControl).toContain('no-store');
      }
    }

    const navigation = await page.goto(`/insights/${slug}`);
    expect(navigation?.status(), 'DOM navigation status').toBe(200);
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    if (canary) {
      await expect(page.locator('body')).not.toContainText(canary);
    }
    await expect(page.getByText(/401|Unauthorized/i)).toHaveCount(0);
  });

  test('TC-S8-EDGE-005 map islands=[] 응답에도 바다 빈 상태를 렌더하고 alert·5xx를 노출하지 않음', async ({
    page,
  }) => {
    await page.route('**/api/v1/insight/map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          message: 'OK',
          content: { islands: [], readingBudget: null },
        }),
      });
    });

    await page.goto('/insights');
    await expect(page.getByTestId('insight-worldmap')).toBeVisible();
    await expect(page.getByText('아직 열린 섬 0곳')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '첫 섬이 열리기 전이에요' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '오늘의 화두 보기' }),
    ).toBeVisible();
    await expect(
      page.getByTestId('insight-worldmap').getByRole('alert'),
    ).toHaveCount(0);
    await expect(page.getByText(/5\d\d|internal server error/i)).toHaveCount(0);
  });

  test('TC-S8-EDGE-006 만료 accessToken·refresh 없음이어도 공개 첫 편은 로그인 전환 없이 표시', async ({
    page,
  }) => {
    const slug = requiredEnv('E2E_SPRINT8_FIRST_SLUG');
    const title = requiredEnv('E2E_SPRINT8_FIRST_TITLE');
    const target = new URL(WEB_BASE_URL);
    const encoded = Buffer.from(
      JSON.stringify({ exp: 1, memberId: 981301, roleIds: ['ROLE_MEMBER'] }),
    ).toString('base64url');
    await page.context().addCookies([
      {
        name: 'accessToken',
        value: `eyJhbGciOiJub25lIn0.${encoded}.expired`,
        domain: target.hostname,
        path: '/',
        secure: target.protocol === 'https:',
        httpOnly: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`/insights/${slug}`);
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/insights/${slug}`);
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/401|Unauthorized/i)).toHaveCount(0);
  });

  test('TC-S8-EDGE-007 전면 무료 모드에서는 잔액 0 회원도 본문이 바로 열리고 결제 유도가 없음', async ({
    page,
    request,
  }) => {
    const memberId = requiredNumber(
      'E2E_SPRINT8_ZERO_BALANCE_MEMBER_ID',
      981301,
    );
    const slug = requiredEnv('E2E_SPRINT8_ZERO_BALANCE_LOCKED_SLUG');
    const title = requiredEnv('E2E_SPRINT8_LOCKED_TITLE');
    await authenticate(page, request, memberId);

    const navigation = await page.goto(`/insights/${slug}`);
    expect(navigation?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('unlock-article')).toHaveCount(0);
    await expect(
      page.getByText(/결제|구매|충전|카드|요금|유료|[0-9,]+원/),
    ).toHaveCount(0);
  });
});
