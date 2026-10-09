import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from '@playwright/test';

const WEB_BASE_URL = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
const QA_MEMBER_ID = Number(process.env.E2E_SPRINT8_GH_B_MEMBER_ID ?? '981407');
const QA_KOAN_ID = Number(
  process.env.E2E_SPRINT8_GH_B_KOAN_ID ??
    process.env.E2E_SPRINT8_HAPPY_B_KOAN_ID ??
    '981407',
);
const QA_UNLINKED_MEMBER_ID = Number(
  process.env.E2E_SPRINT8_GH_033_MEMBER_ID ?? '981416',
);
const QA_ZERO_BUDGET_MEMBER_ID = Number(
  process.env.E2E_SPRINT8_GH_026_MEMBER_ID ??
    process.env.E2E_SPRINT8_ZERO_BALANCE_MEMBER_ID ??
    '981415',
);
const QA_REST_DAY_CATEGORY =
  process.env.E2E_SPRINT8_GH_040_CATEGORY_SLUG?.trim() ?? 'network-security';

interface ApiEnvelope<T> {
  content?: T;
  data?: T;
}

interface InsightArticle {
  documentId: string;
  slug: string;
  title: string;
  unlockCost: number;
  state: 'READ' | 'NEXT' | 'UNLOCKED' | 'LOCKED' | null;
}

interface InsightIsland {
  islandId: number;
  slug: string;
  name: string;
  presentationTier: 'OCEAN' | 'NEW';
  bridgeRoomId: number | null;
  progress: {
    read: number;
    total: number;
    conquered: boolean;
  } | null;
  articles: InsightArticle[];
}

interface InsightMap {
  islands: InsightIsland[];
  readingBudget: { balance: number; dailyCap: number } | null;
}

interface KoanSummary {
  koanId: number;
  publishedAt: string;
  question: string;
}

interface KoanPage {
  items: KoanSummary[];
}

interface KoanDetail extends KoanSummary {
  conceptSummary: string;
  modelAnswerMd: string;
}

function unwrap<T>(body: ApiEnvelope<T>, label: string): T {
  const value = body.content ?? body.data;
  expect(value, `${label} 응답에 content/data가 필요하다`).toBeTruthy();
  return value as T;
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
  return unwrap<T>((await response.json()) as ApiEnvelope<T>, path);
}

async function mintToken(
  request: APIRequestContext,
  memberId = QA_MEMBER_ID,
): Promise<string> {
  expect(memberId, 'SPRINT8 GH-B member id').toBeGreaterThan(0);
  const response = await request.get(
    `${API_BASE_URL}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
  );
  expect(response.status(), 'QA 회원 토큰 발급').toBe(200);
  const token = unwrap<{ accessToken: string }>(
    (await response.json()) as ApiEnvelope<{ accessToken: string }>,
    'QA 회원 토큰',
  ).accessToken;
  expect(token).toBeTruthy();
  return token;
}

async function authenticate(
  page: Page,
  request: APIRequestContext,
  memberId = QA_MEMBER_ID,
) {
  const token = await mintToken(request, memberId);
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

function expectNoCommerceSurface(value: unknown) {
  expect(JSON.stringify(value)).not.toMatch(
    /결제|구매|충전|payment|purchase|checkout/i,
  );
}

function markdownToVisibleText(value: string) {
  return value
    .replace(/[`*_>#()[\]~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const kstDateKey = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

test.describe('SPRINT8 GH 정상 흐름 B @sprint8 @sprint8-dev', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-S8-GH-026 잔액 0에서 잠긴 편은 열리지 않고 회복·무료 화두를 안내한다', async ({
    page,
    request,
  }) => {
    const token = await authenticate(page, request, QA_ZERO_BUDGET_MEMBER_ID);
    const map = await apiGet<InsightMap>(request, '/api/v1/insight/map', token);
    expect(map.readingBudget?.balance, 'QA 회원의 읽기 예산').toBe(0);
    const target = map.islands
      .flatMap((island) =>
        island.articles.map((article) => ({ island, article })),
      )
      .find(
        ({ article }) => article.state === 'NEXT' && article.unlockCost === 1,
      );
    expect(target, '비용 1인 다음 잠금 편 fixture').toBeTruthy();

    await page.goto(`/insights/land/${target?.island.slug}`);
    const articleButton = page.getByTestId(
      `article-${String(target?.article.slug)}`,
    );
    await expect(articleButton).toContainText('물길 하나로 열립니다');

    const [unlockResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/api/v1/insight/articles/') &&
          response.url().endsWith('/unlock'),
      ),
      articleButton.click(),
    ]);
    expect(unlockResponse.status()).toBe(200);
    const unlockBody = (await unlockResponse.json()) as unknown;
    expect(JSON.stringify(unlockBody)).toContain('RBG001');
    expectNoCommerceSurface(unlockBody);

    await expect(page).toHaveURL(
      new RegExp(`/insights/land/${target?.island.slug}$`),
    );
    await expect(page.getByText('오늘의 물때를 모두 썼습니다')).toBeVisible();
    await expect(
      page.getByText(
        '내일 아침 여섯 시에 다시 찹니다. 화두는 지금도 읽을 수 있어요.',
      ),
    ).toBeVisible();
    expectNoCommerceSurface(await page.locator('body').innerText());
  });

  test('TC-S8-GH-027 잔액 0에서도 화두 질문·개념·AI 모범답안은 차감 없이 열린다', async ({
    page,
    request,
  }) => {
    const token = await authenticate(page, request);
    const before = await apiGet<InsightMap>(
      request,
      '/api/v1/insight/map',
      token,
    );
    expect(before.readingBudget?.balance).toBe(0);
    const koan = await apiGet<KoanDetail>(
      request,
      `/api/v1/koans/${QA_KOAN_ID}`,
      token,
    );

    await page.goto(`/insights/koans/${QA_KOAN_ID}`);
    await expect(
      page.getByRole('heading', { name: koan.question, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(koan.conceptSummary, { exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('koan-detail')).toContainText(
      markdownToVisibleText(koan.modelAnswerMd),
    );
    await expect(page.getByText(/잔액 부족|잠긴 화두|결제|구매/)).toHaveCount(
      0,
    );

    const after = await apiGet<InsightMap>(
      request,
      '/api/v1/insight/map',
      token,
    );
    expect(after.readingBudget?.balance).toBe(0);
  });

  test('TC-S8-GH-029 활성 섬은 OCEAN 8곳과 NEW grid로 전부 보이고 가로 넘침·겹침이 없다', async ({
    page,
    request,
  }) => {
    // 회장 결정 2026-08-21: 수평선 표지는 **되살리지 않는다.**
    // 그래서 이 케이스가 보는 것은 "초과분을 접었는가" 가 아니라
    // "전부 깔았을 때도 화면이 무너지지 않는가" 로 바뀐다.
    // 지키는 것 셋: 섬이 전부 보인다 / 가로로 넘치지 않는다 / 서로 겹치지 않는다.
    // 표지가 없으므로 표지가 **없다는 것**도 함께 단언한다. 다시 생기면 회귀다.
    const token = await authenticate(page, request);
    const map = await apiGet<InsightMap>(request, '/api/v1/insight/map', token);
    const conquered = map.islands.filter(
      (island) => island.progress?.conquered,
    );
    const oceanIslands = map.islands.filter(
      (island) => island.presentationTier === 'OCEAN',
    );
    const newIslands = map.islands.filter(
      (island) => island.presentationTier === 'NEW',
    );
    expect(oceanIslands, '승인 시작 섬').toHaveLength(8);

    await page.goto('/insights');
    await expect(page.getByTestId('insight-worldmap')).toBeVisible();
    // OCEAN은 바다의 버튼으로, NEW는 화두 뒤 grid의 링크로 전부 보여야 한다.
    for (const island of oceanIslands) {
      await expect(page.getByTestId(`island-${island.slug}`)).toBeVisible();
    }
    const newGrid = page.getByRole('region', { name: /새로 열린 섬/ });
    for (const island of newIslands) {
      await expect(
        newGrid.getByRole('link', { name: island.name, exact: true }),
      ).toHaveAttribute('href', `/insights/land/${island.slug}`);
    }
    // 개척한 섬은 tier 와 무관하게 전부 화면에 남아야 한다(PRD FR-022).
    for (const island of conquered) {
      if (island.presentationTier === 'OCEAN') {
        await expect(page.getByTestId(`island-${island.slug}`)).toBeVisible();
      } else {
        await expect(
          newGrid.getByRole('link', { name: island.name, exact: true }),
        ).toBeVisible();
      }
    }
    await expect(page.getByText(/수평선 너머 \d+곳/)).toHaveCount(0);

    const overflow = await page
      .getByTestId('insight-worldmap')
      .evaluate((node) => ({
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    // 버튼 상자와 **이름표**를 따로 본다.
    //
    // 예전에는 버튼만 봤다. 그랬더니 밴드를 두 줄로 묶어 칸이 좁아졌을 때
    // 버튼끼리는 안 겹치는데 **이름표가 칸 밖으로 퍼져 서로 뭉개지는** 화면이
    // 통과했다(2026-08-22 dev 실측: 20곳 모바일에서 섬 이름을 한 글자도 못 읽었다).
    // 사람이 읽는 것은 이름표이므로 이름표 겹침도 결함이다.
    const collectBoxes = async (selector: string) => {
      const nodes = await page.locator(selector).all();
      const boxes = await Promise.all(
        nodes.map((locator) => locator.boundingBox()),
      );
      return boxes.filter((box) => box !== null);
    };
    const expectNoOverlap = (
      boxes: Awaited<ReturnType<typeof collectBoxes>>,
      label: string,
    ) => {
      for (let left = 0; left < boxes.length; left += 1) {
        for (let right = left + 1; right < boxes.length; right += 1) {
          const a = boxes[left];
          const b = boxes[right];
          const overlaps =
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
          expect(overlaps, `${label} ${left + 1}\u00b7${right + 1} 겹침`).toBe(
            false,
          );
        }
      }
    };

    expectNoOverlap(
      await collectBoxes('button[data-testid^="island-"]:visible'),
      '섬 버튼',
    );
    expectNoOverlap(
      await collectBoxes('[data-testid^="island-label-"]:visible'),
      '섬 이름표',
    );
  });

  test('TC-S8-GH-031 연결된 섬 팝오버의 공부방은 중간 화면 없이 방 안으로 직행한다', async ({
    page,
    request,
  }) => {
    const token = await authenticate(page, request);
    const map = await apiGet<InsightMap>(request, '/api/v1/insight/map', token);
    const linked = map.islands.find((island) => island.bridgeRoomId !== null);
    expect(linked, '공부방 연결 섬 fixture').toBeTruthy();

    await page.goto('/insights');
    await page.getByTestId(`island-${linked?.slug}`).click();
    const roomLink = page.getByRole('link', { name: /공부방 들어가기/ });
    // 링크는 `?from=<섬 slug>` 를 달고 나간다. 이것은 결함이 아니라 PR #461
    // (바다에서 공부방 진입 시 개척지 맥락 누락 수정) 이 넣은 출처 파라미터이고,
    // 방 화면의 "N 개척지에서 들어왔습니다" 문구가 이 값을 쓴다.
    // 이 테스트가 보는 것은 "중간 화면 없이 방으로 직행하는가" 이므로
    // 경로만 단언하고 출처 파라미터는 허용한다.
    await expect(roomLink).toHaveAttribute(
      'href',
      new RegExp(`^/community/rooms/${linked?.bridgeRoomId}(\\?|$)`),
    );
    await roomLink.click();
    await expect(page).toHaveURL(
      new RegExp(`/community/rooms/${linked?.bridgeRoomId}(\\?|$)`),
    );
    await expect(page.getByText(/참여 개수 제한|3\/3|방을 교체/)).toHaveCount(
      0,
    );
  });

  test('TC-S8-GH-032 일반 회원의 섬 팝오버에는 방 개설·관리 요소가 DOM에 없다', async ({
    page,
    request,
  }) => {
    const token = await authenticate(page, request);
    const map = await apiGet<InsightMap>(request, '/api/v1/insight/map', token);
    expect(map.islands.length).toBeGreaterThan(0);

    await page.goto('/insights');
    await page.getByTestId(`island-${map.islands[0].slug}`).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /방 개설|방 관리|운영자/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: /방 개설|방 관리|운영자/ }),
    ).toHaveCount(0);
    await expect(page.getByText(/방 개설|방 관리|운영자 전용/)).toHaveCount(0);
  });

  test('TC-S8-GH-033 방 미연결 섬은 tier별 승인 진입 경로를 제공하고 깨진 방 링크·5xx가 없다', async ({
    page,
    request,
  }) => {
    const token = await authenticate(page, request, QA_UNLINKED_MEMBER_ID);
    const map = await apiGet<InsightMap>(request, '/api/v1/insight/map', token);
    const unlinked = map.islands.find(
      (island) =>
        island.bridgeRoomId === null && island.progress?.conquered === true,
    );
    expect(unlinked, '개척 완료된 방 미연결 섬 fixture').toBeTruthy();
    const serverErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 500) serverErrors.push(response.url());
    });

    await page.goto('/insights');
    if (unlinked?.presentationTier === 'OCEAN') {
      const unlinkedIsland = page.getByTestId(`island-${unlinked.slug}`);
      await expect(unlinkedIsland).toBeVisible();
      await unlinkedIsland.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('공부방 준비 중')).toBeVisible();
      await expect(dialog.getByText('열리면 여기에')).toBeVisible();
      await expect(dialog.getByRole('link', { name: /공부방/ })).toHaveCount(0);
    } else {
      const safeLandLink = page
        .getByRole('region', { name: /새로 열린 섬/ })
        .getByRole('link', { name: unlinked?.name, exact: true });
      await expect(safeLandLink).toHaveAttribute(
        'href',
        `/insights/land/${unlinked?.slug}`,
      );
      await expect(page.locator(`a[href*="community/rooms"]`)).toHaveCount(0);
    }
    expect(serverErrors, '팝오버 렌더 중 5xx').toEqual([]);
  });

  test('TC-S8-GH-037 모범답안 직후 보완 프롬프트 2종은 한 번 클릭으로 입력을 연다', async ({
    page,
    request,
  }) => {
    await authenticate(page, request);
    await page.goto(`/insights/koans/${QA_KOAN_ID}`);
    const detail = page.getByTestId('koan-detail');
    const experiencePrompt = detail.getByRole('button', {
      name: '당신 현장에서는 어떻게 다른가요?',
      exact: true,
    });
    const missingPrompt = detail.getByRole('button', {
      name: '이 답에서 빠진 게 있나요?',
      exact: true,
    });
    await expect(experiencePrompt).toBeVisible();
    await expect(missingPrompt).toBeVisible();
    const [answerBox, experienceBox] = await Promise.all([
      detail
        .getByRole('heading', { name: '이 물음에 대한 답', exact: true })
        .boundingBox(),
      experiencePrompt.boundingBox(),
    ]);
    expect(answerBox).not.toBeNull();
    expect(experienceBox?.y).toBeGreaterThan(Number(answerBox?.y));
    await expect(detail.getByText('정답', { exact: true })).toHaveCount(0);
    await expect(detail.getByText('맞히기', { exact: true })).toHaveCount(0);

    await experiencePrompt.click();
    await expect(page.getByTestId('koan-answer-input')).toBeVisible();
    await page.reload();
    await missingPrompt.click();
    await expect(page.getByTestId('koan-answer-input')).toBeVisible();
  });

  test('TC-S8-GH-038 채택된 기존 Q&A 보완 답변은 보완 채택 라벨로 표시된다', async ({
    page,
  }) => {
    await page.goto(`/insights/koans/${QA_KOAN_ID}`);
    const accepted = page.getByText('보완 채택', { exact: true });
    await expect(accepted).toBeVisible();
    await expect(page.getByText('정답', { exact: true })).toHaveCount(0);
  });

  test('TC-S8-GH-040 재고 0 게시일은 쉬어감 안내와 지난 화두를 함께 렌더한다', async ({
    page,
    request,
  }) => {
    const koans = await apiGet<KoanPage>(
      request,
      `/api/v1/koans?page=1&size=20&categorySlug=${encodeURIComponent(QA_REST_DAY_CATEGORY)}`,
    );
    expect(koans.items.length, '지난 화두 fixture').toBeGreaterThan(0);
    expect(
      koans.items.every(
        (koan) => kstDateKey(koan.publishedAt) !== kstDateKey(new Date()),
      ),
      '전용 카테고리에 오늘 게시물이 없어야 함',
    ).toBe(true);
    const pastQuestion = koans.items[0].question;
    const serverErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 500) serverErrors.push(response.url());
    });

    await page.goto(
      `/insights/koans?category=${encodeURIComponent(QA_REST_DAY_CATEGORY)}`,
    );
    await expect(
      page.getByText('이번 주는 쉬어갑니다', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('지난 화두', { exact: true })).toBeVisible();
    await expect(
      page.getByTestId('koan-list').getByText(pastQuestion, { exact: true }),
    ).toBeVisible();
    expect(serverErrors, '화두 목록 렌더 중 5xx').toEqual([]);
  });
});
