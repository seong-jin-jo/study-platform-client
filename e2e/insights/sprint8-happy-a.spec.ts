import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';
import {
  articleAlreadyRead,
  readingBudgetDrained,
  zeroBalanceMemberUnset,
} from '../support/sprint8-preconditions';

const WEB_BASE_URL = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

const envMemberId = (name: string, fallback: number) => {
  const value = Number(process.env[name]?.trim() ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

const QA_MEMBER = {
  balanceOnly: envMemberId('E2E_SPRINT8_GH_016_MEMBER_ID', 981401),
  lockedPresentation: envMemberId('E2E_SPRINT8_GH_017_MEMBER_ID', 981411),
  completionLong: envMemberId('E2E_SPRINT8_GH_021_MEMBER_ID', 981412),
  completionShort: envMemberId('E2E_SPRINT8_GH_022_MEMBER_ID', 981413),
  consume: envMemberId('E2E_SPRINT8_GH_024_MEMBER_ID', 981414),
  zeroBudget: envMemberId('E2E_SPRINT8_GH_025_MEMBER_ID', 981406),
} as const;

const QA_ARTICLE = {
  completionLong:
    process.env.E2E_SPRINT8_COMPLETION_LONG_SLUG?.trim() ??
    'deploy-finished-service-not-ready',
  completionShort:
    process.env.E2E_SPRINT8_COMPLETION_SHORT_SLUG?.trim() ??
    'short-transaction-long-lock-wait',
  paid:
    process.env.E2E_SPRINT8_PAID_SLUG?.trim() ??
    'short-transaction-long-lock-wait',
} as const;

const PUBLISH_FIXTURE = {
  allChannels: 'QA GH-A 세 채널 일괄 발행',
  editedMail: 'QA GH-A 메일 제목 수정 발행',
  partial: 'QA GH-A SNS 보류 발행',
} as const;

interface ApiEnvelope<T> {
  content?: T;
  data?: T;
}

interface SocialProof {
  explorerCount: number;
  helpfulByMe: boolean;
  helpfulCount: number;
  viewCount: number;
}

interface MapArticle {
  accessLevel?: 'FREE' | 'LOCKED' | 'UNLOCKED';
  documentId: string;
  slug: string;
  socialProof: SocialProof;
  state?: 'LOCKED' | 'NEXT' | 'READ' | 'UNLOCKED';
  title: string;
  unlockCost: number;
}

interface MapIsland {
  articles: MapArticle[];
  islandId: number;
  name: string;
  presentationTier: 'NEW' | 'OCEAN';
  progress?: {
    conquered: boolean;
    read: number;
    total: number;
  };
  slug: string;
}

interface InsightMap {
  islands: MapIsland[];
  readingBudget?: { balance: number; dailyCap: number } | null;
}

interface KoanPage {
  items: Array<{ koanId: number }>;
}

interface UnlockResult {
  balanceAfter: number;
  cost: number;
  unlocked: boolean;
}

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

function unwrap<T>(body: ApiEnvelope<T>): T {
  const value = body.content ?? body.data;
  if (value === undefined) throw new Error('API envelope has no content/data');
  return value;
}

async function mintToken(
  request: APIRequestContext,
  memberId: number,
  role: 'ROLE_ADMIN' | 'ROLE_MEMBER' = 'ROLE_MEMBER',
): Promise<string> {
  const response = await request.get(
    `${API_BASE_URL}/api/v1/tokens/token?member-id=${memberId}&role-id=${role}`,
  );
  expect(response.status(), `token mint for ${memberId}/${role}`).toBe(200);
  const body = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
  const token = unwrap(body).accessToken;
  expect(token).toBeTruthy();
  return token;
}

async function authenticate(
  page: Page,
  request: APIRequestContext,
  memberId: number,
  role: 'ROLE_ADMIN' | 'ROLE_MEMBER' = 'ROLE_MEMBER',
): Promise<string> {
  const token = await mintToken(request, memberId, role);
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

async function apiGet<T>(
  request: APIRequestContext,
  path: string,
  token?: string,
): Promise<T> {
  const response = await request.get(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  expect(response.status(), `GET ${path}`).toBe(200);
  return unwrap((await response.json()) as ApiEnvelope<T>);
}

async function getMap(
  request: APIRequestContext,
  token?: string,
): Promise<InsightMap> {
  return apiGet<InsightMap>(request, '/api/v1/insight/map', token);
}

async function gotoIslandAndWait(page: Page, slug: string): Promise<void> {
  const responses = Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/insight/map') &&
        response.request().method() === 'GET',
    ),
    page.waitForResponse(
      (response) =>
        /\/api\/v1\/insight\/islands\/\d+(?:\?|$)/.test(response.url()) &&
        response.request().method() === 'GET',
    ),
  ]);

  await page.goto(`/insights/land/${slug}`);
  const [mapResponse, islandResponse] = await responses;
  expect(mapResponse.status(), 'island page map response').toBe(200);
  expect(islandResponse.status(), 'island page detail response').toBe(200);
  await expect(page.getByTestId('island-detail')).toBeVisible();
}

function requireIsland(
  map: InsightMap,
  predicate: (island: MapIsland) => boolean = () => true,
): MapIsland {
  const island = map.islands.find(predicate);
  expect(island, 'required island fixture').toBeTruthy();
  return island as MapIsland;
}

function requireArticle(
  map: InsightMap,
  predicate: (article: MapArticle) => boolean,
): { article: MapArticle; island: MapIsland } {
  for (const island of map.islands) {
    const article = island.articles.find(predicate);
    if (article) return { article, island };
  }
  throw new Error('required article fixture was not found');
}

function requireArticleBySlug(map: InsightMap, slug: string) {
  return requireArticle(map, (article) => article.slug === slug);
}

async function firstKoanId(request: APIRequestContext): Promise<number> {
  const page = await apiGet<KoanPage>(request, '/api/v1/koans?page=1&size=1');
  expect(page.items).toHaveLength(1);
  return page.items[0].koanId;
}

function reviewCard(page: Page, question: string): Locator {
  return page.getByTestId('koan-review-card').filter({ hasText: question });
}

interface ElementBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

async function openPublishConsole(page: Page): Promise<void> {
  await page.goto(requiredEnv('E2E_SPRINT8_PUBLISH_CONSOLE_PATH'));
  await expect(
    page.getByRole('heading', { name: '화두 발행 콘솔' }),
  ).toBeVisible();
}

test.describe('SPRINT8 GH-A 발행 콘솔 @sprint8 @sprint8-dev @auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page, request }) => {
    await authenticate(page, request, 68, 'ROLE_ADMIN');
  });

  test('TC-S8-GH-001 승인 후에만 게시', async ({ page }) => {
    await openPublishConsole(page);
    const card = reviewCard(page, PUBLISH_FIXTURE.allChannels);
    await expect(card).toContainText('검토 대기');

    await card.getByRole('button', { name: '발행', exact: true }).click();

    await expect(card).toContainText('PUBLISHED');
    await expect(card.getByText(/승인자\s*68/)).toBeVisible();
    await expect(card.getByText(/승인시각\s*\d{4}-\d{2}-\d{2}/)).toBeVisible();
    await expect(
      card.getByText('커뮤니티 Q&A 1건', { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByText('사이트 게시 트리거 1건', { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByText('메일 발송 트리거 1건', { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByText('SNS 배포 트리거 1건', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/채널별.*승인 요청/)).toHaveCount(0);
  });

  test('TC-S8-GH-002 인라인 수정 후 발행', async ({ page }) => {
    const editedTitle = 'QA GH-A 수정된 메일 제목';
    await openPublishConsole(page);
    const card = reviewCard(page, PUBLISH_FIXTURE.editedMail);
    const originalSite = await card
      .getByTestId('site-render-body')
      .textContent();
    const originalSocial = await card
      .getByTestId('social-render-body')
      .textContent();

    await card.getByRole('textbox', { name: '메일 제목' }).fill(editedTitle);
    await card.getByRole('button', { name: '발행', exact: true }).click();

    await expect(card.getByTestId('mail-render-title')).toHaveText(editedTitle);
    await expect(card.getByTestId('mail-delivery-title')).toHaveText(
      editedTitle,
    );
    await expect(
      card.getByText(/수정 전.*QA GH-A 메일 제목 수정 발행/),
    ).toBeVisible();
    await expect(
      card.getByText(`수정 후 ${editedTitle}`, { exact: false }),
    ).toBeVisible();
    await expect(card.getByTestId('site-render-body')).toHaveText(
      originalSite ?? '',
    );
    await expect(card.getByTestId('social-render-body')).toHaveText(
      originalSocial ?? '',
    );
  });

  test('TC-S8-GH-003 부분 발행 선택', async ({ page }) => {
    await openPublishConsole(page);
    const card = reviewCard(page, PUBLISH_FIXTURE.partial);

    await card.getByRole('checkbox', { name: 'SNS 발행' }).uncheck();
    await card.getByRole('button', { name: '발행', exact: true }).click();

    await expect(
      card.getByText('사이트 발행됨', { exact: true }),
    ).toBeVisible();
    await expect(card.getByText('메일 발송됨', { exact: true })).toBeVisible();
    await expect(
      card.getByText('SNS 발행 보류', { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByRole('button', { name: 'SNS 재발행' }),
    ).toBeEnabled();
  });
});

test.describe('SPRINT8 GH-A 사용자 화면 @sprint8 @sprint8-dev', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-S8-GH-014 섬과 중복 텍스트 링크 0', async ({ page, request }) => {
    await getMap(request);
    await page.goto('/insights');
    const worldmap = page.getByTestId('insight-worldmap');
    const islandButtons = worldmap.locator('[data-testid^="island-"]');
    await expect(islandButtons.first()).toBeVisible();
    const testIds = await islandButtons.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-testid')),
    );
    expect(new Set(testIds).size).toBe(testIds.length);

    await expect(islandButtons).toHaveCount(testIds.length);
    const ocean = worldmap.getByRole('region', { name: '시작 섬 8개' });
    await expect(ocean.locator('a[href^="/insights/land/"]')).toHaveCount(0);
    const newIslandHrefs = await worldmap
      .getByRole('region', { name: /새로 열린 섬/ })
      .locator('a[href^="/insights/land/"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    expect(new Set(newIslandHrefs).size).toBe(newIslandHrefs.length);
    await islandButtons.first().focus();
    await expect(islandButtons.first()).toBeFocused();
    await islandButtons.first().click();
    const dialog = worldmap.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // 다이얼로그가 개척지로 보내는 링크는 **정확히 하나**여야 한다. 그게 이 검사
    // 이름("중복 텍스트 링크 0")이 뜻하는 것이다.
    //
    // 종전에는 이름이 /개념글/ 인 링크를 찾았는데, 승인 화면에서 "개념글 N편" 은
    // 링크가 아니라 부제 텍스트이고(insight-learning-map.tsx L556-559), 개척지로
    // 가는 링크의 이름은 "개척지 들어가기" 다(같은 파일 L561-566). 그래서 이
    // 단언은 화면이 정상일 때도 0건을 받았다. 제품이 아니라 검사가 틀렸다.
    await expect(
      dialog.getByRole('link', { name: /개척지 들어가기/ }),
    ).toHaveCount(1);
    // 이름 말고 주소로도 못박는다. 문구가 바뀌어도 "개척지로 가는 길은 하나"
    // 라는 규칙 자체는 계속 지켜져야 한다.
    await expect(dialog.locator('a[href^="/insights/land/"]')).toHaveCount(1);
  });

  test('TC-S8-GH-015 비회원 첫 화면', async ({ page, request }) => {
    const map = await getMap(request);
    expect(map.readingBudget).toBeNull();
    expect(
      map.islands.every((island) => (island.progress?.read ?? 0) === 0),
    ).toBe(true);

    await page.goto('/insights');
    const worldmap = page.getByTestId('insight-worldmap');
    // `[data-testid^="island-"]` 는 섬 버튼뿐 아니라 라벨 span(`island-label-*`)
    // 까지 잡는다. span 에는 접근명이 없으니 아래 단언이 항상 깨진다
    // (2026-08-21 실측: island-label-deployment-operations 가 잡혔다).
    // 같은 스위트의 다른 테스트처럼 버튼으로 좁힌다.
    const visibleIslands = worldmap.locator('button[data-testid^="island-"]');
    await expect(visibleIslands.first()).toBeVisible();
    for (const islandButton of await visibleIslands.all()) {
      await expect(islandButton).toHaveAccessibleName(/.+ 개척지 열기/);
    }
    // 회장 결정 2026-08-21: "허용해. 비회원일수록 다채롭게 보여줘야지".
    // 원래 이 줄은 진행도 문구가 아예 0건이어야 한다고 단언했다. 그런데
    // 현재 섬 카드의 `8편 중 0편` 은 PRD v1.2.1 §551 Fit Criterion ④ 기준으로는
    // 위반이 아니다. 그 조항이 금지하는 것은 "가짜 진행 상태"이고 0편은 가짜가
    // 아니라 사실이기 때문이다. 기준이 서로 달라 회장께 올렸고, 비회원 화면을
    // 더 풍부하게 두는 쪽으로 확정됐다.
    // 따라서 단언을 PRD 기준으로 옮긴다. **읽은 편수가 0 인지**를 본다.
    // 0 이 아닌 진행도가 비회원에게 뜨면 그것은 여전히 결함이다.
    const progressLabels = await worldmap
      .getByText(/\d+편 중 \d+편/)
      .allTextContents();
    for (const label of progressLabels) {
      expect(label, `비회원에게 뜬 진행도: ${label}`).toMatch(/중 0편/);
    }
    await expect(worldmap.getByText(/[1-9]\d*곳 개척/)).toHaveCount(0);

    const primary = worldmap.getByRole('link', {
      name: '화두 읽고 생각 남기기',
    });
    await expect(primary).toBeVisible();
    await expect(worldmap.getByText(/로그인하면.*기록/)).toHaveCount(0);
  });

  test('TC-S8-GH-016 잔액은 개념글 목록에만', async ({ page, request }) => {
    const token = await authenticate(page, request, QA_MEMBER.balanceOnly);
    const map = await getMap(request, token);
    // 승인 시안 정본은 잔액 5 · 하루 상한 5 다
    // (docs/design/sprint8/sprint8-v10-final-design-reapproval-v3.3.0: "balance 5, dailyCap 5").
    // 예전 테스트는 3 을 하드코딩해 늘 실패했다(2026-08-21 dev 실측: 5).
    // 숫자를 다시 박지 않고 상한과 같은지로 본다. 상한이 바뀌어도 따라간다.
    expect(map.readingBudget?.balance).toBe(map.readingBudget?.dailyCap);
    const island = requireIsland(
      map,
      (candidate) => candidate.articles.length > 0,
    );
    const koanId = await firstKoanId(request);
    // 문구의 숫자도 하드코딩(3)돼 있었다. 화면은 정본대로 5 를 표시한다.
    // 실제 잔액에서 문구를 만들어 숫자가 바뀌어도 따라가게 한다.
    const balanceText = `오늘 물길 ${map.readingBudget?.balance}개가 남아 있습니다`;

    await page.goto('/insights');
    await expect(page.getByText(balanceText, { exact: true })).toHaveCount(0);
    await page.goto(`/insights/koans/${koanId}`);
    await expect(page.getByText(balanceText, { exact: true })).toHaveCount(0);
    await gotoIslandAndWait(page, island.slug);
    await expect(page.getByTestId('insight-reading-balance')).toHaveText(
      balanceText,
    );
  });

  test('TC-S8-GH-017 잠긴 편 표현', async ({ page, request }) => {
    const token = await authenticate(
      page,
      request,
      QA_MEMBER.lockedPresentation,
    );
    const map = await getMap(request, token);
    const island = requireIsland(
      map,
      (candidate) =>
        candidate.articles.filter(
          (article) => article.state === 'NEXT' && article.unlockCost === 1,
        ).length === 1 &&
        candidate.articles.filter((article) => article.state === 'LOCKED')
          .length >= 1,
    );
    await gotoIslandAndWait(page, island.slug);
    const list = page.getByTestId('island-detail');

    await expect(list.getByText(/\d+\s*(원|포인트|물길)/)).toHaveCount(0);
    await expect(
      list.getByText('물길 하나로 열립니다', { exact: true }),
    ).toHaveCount(1);
    await expect(
      list.locator('[data-testid^="article-"]:disabled'),
    ).toHaveCount(
      island.articles.filter((article) => article.state === 'LOCKED').length,
    );
    await expect(list.getByText(/자물쇠|🔒/)).toHaveCount(0);
    await expect(
      list.locator('svg[aria-label*="잠"], svg[aria-label*="자물쇠"]'),
    ).toHaveCount(0);
  });

  test('TC-S8-GH-018 비회원은 사회적 증거 수치만', async ({
    page,
    request,
  }) => {
    const map = await getMap(request);
    const { article } = requireArticleBySlug(
      map,
      process.env.E2E_SPRINT8_FIRST_SLUG ?? 'deploy-finished-service-not-ready',
    );
    expect(Object.keys(article.socialProof).sort()).toEqual([
      'explorerCount',
      'helpfulByMe',
      'helpfulCount',
      'viewCount',
    ]);

    const helpfulMutations: string[] = [];
    page.on('request', (outgoing) => {
      if (
        /\/helpful\/me(?:\?|$)/.test(outgoing.url()) &&
        outgoing.method() !== 'GET'
      ) {
        helpfulMutations.push(outgoing.method());
      }
    });
    await page.goto(`/insights/${article.slug}`);
    await expect(
      page.getByText(`도움됨 ${article.socialProof.helpfulCount}`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(`조회 ${article.socialProof.viewCount}`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(`지나간 사람 ${article.socialProof.explorerCount}`, {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByTestId('insight-completion-sentinel')
      .scrollIntoViewIfNeeded();
    await expect(page.getByRole('status')).toHaveText(
      '여기까지 다 읽으셨어요. 로그인하면 완독 기록이 남아요.',
    );
    await page.getByRole('button', { name: '도움됐어요', exact: true }).click();
    await expect(
      page.getByText('로그인하면 도움됨을 남길 수 있어요.', { exact: true }),
    ).toBeVisible();
    expect(helpfulMutations).toEqual([]);
  });

  test('TC-S8-GH-020 비회원이 열 수 없는 편은 이유·로그인·무료 화두를 안내함', async ({
    page,
    request,
  }) => {
    const map = await getMap(request);
    const { article } = requireArticle(
      map,
      (candidate) => candidate.unlockCost > 0,
    );
    const response = await page.goto(`/insights/${article.slug}`);

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: article.title, exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('unlock-article')).toBeVisible();
    await expect(
      page.getByText('로그인하면 하루 다섯 물길이 생깁니다', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /물길 없이 읽는 화두 보기/ }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /결제|구매|충전|401|Unauthorized|Internal Server Error|500/,
      ),
    ).toHaveCount(0);
  });

  test('TC-S8-GH-021 본문 끝 도달로 완독', async ({ page, request }) => {
    const token = await authenticate(page, request, QA_MEMBER.completionLong);
    const before = await getMap(request, token);
    const { article, island } = requireArticleBySlug(
      before,
      QA_ARTICLE.completionLong,
    );
    test.skip(article.state === 'READ', articleAlreadyRead(article.slug));
    expect(article.state).not.toBe('READ');

    // 섬을 화면에서 집는 방법은 tier 마다 다르다. 승인 화면은 시작 섬(OCEAN)만
    // `island-<slug>` 버튼으로 그리고, 새로 열린 섬(NEW)은 "새로 열린 섬" 구역의
    // 이름 링크로 그린다(insight-learning-map.tsx L436-437 대 L517-527).
    // 종전에는 tier 를 가리지 않고 항상 testid 를 찾았는데, 이 검사가 쓰는
    // deploy-finished-service-not-ready 의 섬(deployment-operations)은 NEW 라
    // 그 testid 가 애초에 없다(2026-08-31 dev map 실측: presentationTier=NEW).
    // 그래서 정상 화면에서도 60초를 채우고 죽었다. 제품이 아니라 검사가 틀렸다.
    // 집는 방식은 sprint8-happy-b.spec.ts L277-285 의 통과하는 규약을 그대로 쓴다.
    const islandLocator = (target: MapIsland) =>
      target.presentationTier === 'OCEAN'
        ? page.getByTestId(`island-${target.slug}`)
        : page
            .getByRole('region', { name: /새로 열린 섬/ })
            .getByRole('link', { name: target.name, exact: true });

    await page.goto('/insights');
    const beforeBox = await islandLocator(island).boundingBox();
    expect(beforeBox).not.toBeNull();

    // 완독 감지 지점을 기다리기 전에 **본문이 읽히는지부터 확인한다.**
    // 본문이 안 열리면 화면은 잠긴 안내를 띄우고, 그 화면에는 감지 지점이 없어서
    // 아래 대기가 시간만 채우고 죽는다. 그때 로그에 남는 것은 "element(s) not
    // found" 뿐이라 무엇이 잘못됐는지 알 수 없었다(2026-08-31 CI 실측: 같은 검사가
    // 어떤 판에서는 통과하고 어떤 판에서는 이 한 줄만 남기고 죽었다).
    // 먼저 물어보면 실패가 상태 코드와 사유로 스스로를 설명한다.
    // 규약은 TC-S8-GH-022 가 이미 쓰고 있는 것과 같다. 단언이 하나 늘어나는 것이지
    // 무뎌지는 것이 아니다.
    const bodyProbe = await page.evaluate(async (slug: string) => {
      const response = await fetch(
        `/api/private/insights/${encodeURIComponent(slug)}/body`,
        { cache: 'no-store', headers: { Accept: 'application/json' } },
      );
      return {
        status: response.status,
        text: (await response.text()).slice(0, 200),
      };
    }, article.slug);
    expect(
      bodyProbe.status,
      `본문이 읽혀야 완독 검사가 성립한다. 응답: ${bodyProbe.text}`,
    ).toBe(200);

    await page.goto(`/insights/${article.slug}`);
    await expect(page.getByTestId('insight-completion-sentinel')).toBeVisible();
    const [completionResponse] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate
            .url()
            .includes(`/insight/articles/${article.documentId}/progress/me`) &&
          candidate.request().method() === 'PUT',
      ),
      page.getByTestId('insight-completion-sentinel').scrollIntoViewIfNeeded(),
    ]);
    expect(completionResponse.status()).toBe(200);
    await expect(
      page.getByRole('button', { name: /완독|읽음 선언/ }),
    ).toHaveCount(0);

    // 완독이 지도에 반영됐는지는 **읽은 편 수**로 본다.
    //
    // 종전에는 "섬이 화면에서 아래로 내려간다"로 단언했는데, 지도 배치는 위에서부터
    // far -> started -> opened -> here 순이라(sprint8-v10-state.ts L61) 지금 보고 있는
    // 섬이 맨 아래에 온다. 그래서 한 섬을 끝내면 그 섬은 here 를 다음 섬에 넘기고
    // opened 로 **올라간다.** 방향을 아래로 못박은 단언은 배치 규칙과 정면으로
    // 어긋나서 정상 동작에도 실패했다(2026-08-26 실측: 167.5 -> 143).
    const after = await getMap(request, token);
    const { article: articleAfter } = requireArticleBySlug(
      after,
      QA_ARTICLE.completionLong,
    );
    expect(articleAfter.state).toBe('READ');

    await page.goto('/insights');
    const afterBox = await islandLocator(island).boundingBox();
    expect(afterBox).not.toBeNull();
    // 자리가 바뀌는 규칙은 **시작 섬(OCEAN) 배치에만** 있다. far -> started ->
    // opened -> here 는 바다 배치 계산(sprint8-v10-state.ts L61)이 정하는 것이고,
    // "새로 열린 섬" 격자는 서버가 준 순서를 그대로 깔 뿐 읽음 여부로 재정렬하지
    // 않는다(insight-learning-map.tsx L516-528). NEW 섬에 이 단언을 걸면 승인
    // 설계가 약속한 적 없는 것을 요구하는 셈이라, tier 로 갈라 건다.
    // NEW 섬에서도 완독 자체는 위 세 단언(PUT 200 · state READ · 수동 버튼 0)이
    // 그대로 지키므로 검증 강도는 내려가지 않는다.
    if (island.presentationTier === 'OCEAN') {
      expect((afterBox as ElementBox).y).not.toBe((beforeBox as ElementBox).y);
    }
  });

  test('TC-S8-GH-022 스크롤 없는 짧은 글', async ({ page, request }) => {
    await authenticate(page, request, QA_MEMBER.completionShort);
    const map = await getMap(
      request,
      await mintToken(request, QA_MEMBER.completionShort),
    );
    const { article } = requireArticleBySlug(map, QA_ARTICLE.completionShort);
    test.skip(article.state === 'READ', articleAlreadyRead(article.slug));
    expect(article.state).not.toBe('READ');
    await page.setViewportSize({ width: 1440, height: 10000 });

    // 완독 신호를 기다리기 전에 **본문이 읽히는지부터 확인한다.**
    // 본문이 안 열리면 화면은 잠긴 안내를 띄우고, 그 화면에는 완독 감지 지점이
    // 없어서 아래 대기가 60초를 채우고 죽는다. 그때 로그에 남는 것은 "시간 초과"
    // 뿐이라 무엇이 잘못됐는지 알 수 없었다(2026-08-27 CI 실측, 여러 차례).
    // 여기서 먼저 물어보면 실패가 상태 코드와 사유로 스스로를 설명한다.
    await page.goto('/insights');
    const bodyProbe = await page.evaluate(async (slug: string) => {
      const response = await fetch(
        `/api/private/insights/${encodeURIComponent(slug)}/body`,
        { cache: 'no-store', headers: { Accept: 'application/json' } },
      );
      return {
        status: response.status,
        text: (await response.text()).slice(0, 200),
      };
    }, article.slug);
    expect(
      bodyProbe.status,
      `본문이 읽혀야 완독 검사가 성립한다. 응답: ${bodyProbe.text}`,
    ).toBe(200);

    const [completionResponse] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate
            .url()
            .includes(`/insight/articles/${article.documentId}/progress/me`) &&
          candidate.request().method() === 'PUT',
      ),
      page.goto(`/insights/${article.slug}`),
    ]);
    expect(completionResponse.status()).toBe(200);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('TC-S8-GH-024 개념글 열람 시 잔액 1·해금 1건 소비', async ({
    page,
    request,
  }) => {
    const token = await authenticate(page, request, QA_MEMBER.consume);
    const before = await getMap(request, token);
    // 위와 같은 이유로 상한 기준으로 본다(정본 5, 예전 하드코딩 3).
    test.skip(
      before.readingBudget?.balance !== before.readingBudget?.dailyCap,
      readingBudgetDrained(
        before.readingBudget?.balance ?? -1,
        before.readingBudget?.dailyCap ?? -1,
      ),
    );
    expect(before.readingBudget?.balance).toBe(before.readingBudget?.dailyCap);
    const { article, island } = requireArticleBySlug(before, QA_ARTICLE.paid);
    expect(article.state).toBe('NEXT');
    expect(article.unlockCost).toBe(1);
    await page.goto(`/insights/land/${island.slug}`);
    const unlockResponse = page.waitForResponse(
      (candidate) =>
        candidate
          .url()
          .includes(`/insight/articles/${article.documentId}/unlock`) &&
        candidate.request().method() === 'POST',
    );
    await page.getByTestId(`article-${article.slug}`).click();
    const response = await unlockResponse;
    expect(response.status()).toBe(200);
    const result = unwrap((await response.json()) as ApiEnvelope<UnlockResult>);
    // 잔액 기대값은 관찰한 상한에서 뺀다. 종전에는 2 로 박혀 있었는데 그건 상한이
    // 3 이던 시절의 값이라, 상한이 5 로 바뀐 뒤로는 이 검사가 항상 틀렸다
    // (2026-08-26 실측). 이 검사의 요지는 "개념글 한 편에 정확히 1 이 빠진다" 이지
    // 잔액이 특정 숫자가 되는 것이 아니다.
    const capBefore = before.readingBudget?.dailyCap ?? 0;
    expect(result.cost).toBe(1);
    expect(result.balanceAfter).toBe(capBefore - 1);
    await expect(page).toHaveURL(new RegExp(`/insights/${article.slug}$`));
    await expect(
      page.getByText('물길 1개를 썼어요', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('물길 1개를 썼어요', { exact: true }),
    ).toBeHidden({
      timeout: 3500,
    });
    // 읽기 화면에는 "N번째 물길" 위치 표시가 <progress> 로 상시 붙어 있다
    // (blog-detail-page.tsx L494). 그래서 progressbar 를 통째로 0 개로 단언하면
    // 해금이 정상으로 끝나도 항상 실패한다(2026-08-26 실측). 이 단언의 요지는
    // "해금 처리 중 표시가 남지 않는다" 이므로 진행 중 표시만 본다.
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

    const idempotentResponse = await request.post(
      `${API_BASE_URL}/api/v1/insight/articles/${article.documentId}/unlock`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(idempotentResponse.status()).toBe(200);
    const second = unwrap(
      (await idempotentResponse.json()) as ApiEnvelope<UnlockResult>,
    );
    // 두 번째 요청은 이미 열린 글이라 비용이 0 이고 잔액도 그대로여야 한다.
    expect(second.cost).toBe(0);
    expect(second.balanceAfter).toBe(capBefore - 1);
  });

  test('TC-S8-GH-025 첫 편은 잔액 0에도 무료', async ({ page, request }) => {
    const token = await authenticate(page, request, QA_MEMBER.zeroBudget);
    const before = await getMap(request, token);
    test.skip(
      !process.env.E2E_SPRINT8_GH_025_MEMBER_ID?.trim(),
      zeroBalanceMemberUnset,
    );
    expect(before.readingBudget?.balance).toBe(0);
    const { article } = requireArticleBySlug(
      before,
      requiredEnv('E2E_SPRINT8_FIRST_SLUG'),
    );
    expect(article.unlockCost).toBe(0);

    const response = await page.goto(`/insights/${article.slug}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: article.title, exact: true }),
    ).toBeVisible();
    const after = await getMap(request, token);
    expect(after.readingBudget?.balance).toBe(0);
    expect(
      requireArticle(
        after,
        (candidate) => candidate.documentId === article.documentId,
      ).article.unlockCost,
    ).toBe(0);
  });
});
