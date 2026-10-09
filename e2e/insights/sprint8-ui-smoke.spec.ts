import { expect, test } from '@playwright/test';
import {
  fixtureApiReachable,
  fixtureMissingReason,
} from '../support/fixture-api';

const qaDirectory = 'docs/qa/sprint8-full-seo-evidence-v1.0.4-gpt-codex';
// 픽스처 API 주소는 러너가 넘긴다. 여기에 포트를 박아두면 SPRINT8_FIXTURE_PORT 로
// 포트를 옮겨 돌릴 때 이 스펙만 옛 포트로 붙어 연결 거부로 죽는다.
const fixtureApi = `${
  process.env.E2E_FIXTURE_API_BASE?.trim() ?? 'http://127.0.0.1:3290'
}/api/v1/insight/map`;
const sprint8Screens = [
  { name: 'sea', path: '/insights' },
  { name: 'land', path: '/insights/land/dep' },
  { name: 'read', path: '/insights/dep-article-1' },
  { name: 'room', path: '/community/rooms/8?from=dep' },
] as const;

const expectNoUtilityIntersection = async (
  page: import('@playwright/test').Page,
) => {
  const contentRects = await page
    .getByTestId('service-content-root')
    .locator('a, article, button, h1, h2, img, p, section')
    .evaluateAll((elements) =>
      elements
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => ({
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        })),
    );
  const utilityRects = await page
    .locator('[aria-label="카카오톡 상담"], [aria-label="맨 위로 이동"]')
    .evaluateAll((elements) =>
      elements
        .map((element) => ({
          rect: element.getBoundingClientRect(),
          style: window.getComputedStyle(element),
        }))
        .filter(
          ({ rect, style }) =>
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0,
        )
        .map(({ rect }) => ({
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        })),
    );

  const intersections = utilityRects.flatMap((utility, utilityIndex) =>
    contentRects
      .filter(
        (content) =>
          content.left < utility.right &&
          content.right > utility.left &&
          content.top < utility.bottom &&
          content.bottom > utility.top,
      )
      .map((content) => ({ content, utilityIndex })),
  );
  expect(intersections).toEqual([]);
};

const expectUtilityGeometry = async (
  page: import('@playwright/test').Page,
  position: 'fixed' | 'relative',
  size: 56 | 70,
) => {
  const utility = page.getByTestId('service-utility-actions');
  await expect(utility).toHaveCSS('position', position);
  const buttons = utility.locator('a, button');
  await expect(buttons).toHaveCount(2);
  const rects = await buttons.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    }),
  );
  expect(
    rects.every((rect) => rect.height === size && rect.width === size),
  ).toBe(true);
  if (position === 'fixed') {
    expect(
      Math.round((await page.evaluate(() => innerWidth)) - rects[0].right),
    ).toBe(16);
    expect(Math.round(rects[1].top - rects[0].bottom)).toBe(16);
  } else {
    expect(Math.round(rects[1].left - rects[0].right)).toBe(16);
  }
};

const expectNoCardCollisionOrClipping = async (
  page: import('@playwright/test').Page,
  expectedCount: number,
) => {
  const map = page.locator('[data-island-density]');
  const cards = map.locator('button[data-layout-key]');
  await expect(cards).toHaveCount(expectedCount);
  const mapBox = await map.boundingBox();
  const boxes = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }),
  );

  expect(mapBox).not.toBeNull();
  if (!mapBox) return;
  boxes.forEach((box, index) => {
    expect(box.left).toBeGreaterThanOrEqual(mapBox.x);
    expect(box.top).toBeGreaterThanOrEqual(mapBox.y);
    expect(box.right).toBeLessThanOrEqual(mapBox.x + mapBox.width);
    expect(box.bottom).toBeLessThanOrEqual(mapBox.y + mapBox.height);
    boxes.slice(index + 1).forEach((other) => {
      const intersects =
        box.left < other.right &&
        box.right > other.left &&
        box.top < other.bottom &&
        box.bottom > other.top;
      expect(intersects).toBe(false);
    });
  });
};

let fixtureReady = false;
test.beforeAll(async () => {
  fixtureReady = await fixtureApiReachable();
});
test.beforeEach(() => {
  test.skip(!fixtureReady, fixtureMissingReason);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 768 },
]) {
  test(`READ and ROOM match the v10 fixture at ${viewport.width}px`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.setViewportSize(viewport);
    await page.goto('/insights/land/dep', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: '배포·운영', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      fullPage: true,
      path: `${qaDirectory}/land-${viewport.width}.png`,
    });

    await page.goto('/insights/dep-article-1', {
      waitUntil: 'networkidle',
    });
    await expect(
      page.getByRole('heading', {
        name: '배포가 끝났다는 말은 무엇이 끝났다는 뜻인가',
      }),
    ).toBeVisible();
    await expect(page.getByText('조회 396', { exact: true })).toBeVisible();
    const fullCross = page.getByTestId('insight-completion-journey');
    await expect(fullCross).toBeVisible();
    // 2026-08-25 회장 결정: 완독 후속 카드는 시안대로 다음 글 + 관련 화두 2개로
    // 줄였다. 공부방·바다 카드는 더 이상 렌더되지 않는다.
    for (const testId of [
      'insight-completion-next',
      'insight-completion-koan',
    ]) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
    await expect(page.getByTestId('insight-completion-room')).toHaveCount(0);
    await expect(page.getByTestId('insight-completion-sea')).toHaveCount(0);
    await page.screenshot({
      fullPage: true,
      path: `${qaDirectory}/read-${viewport.width}.png`,
    });

    await page.goto('/community/rooms/8?from=dep', {
      waitUntil: 'networkidle',
    });
    await expect(page.getByTestId('community-room-detail')).toBeVisible();
    await expect(
      page.locator('h2:visible').filter({ hasText: '이 방의 이야기' }),
    ).toBeVisible();
    await expect(page.getByText('멤버 14명')).toBeVisible();
    await expect(page.getByTestId('community-room-not-member')).toHaveCount(0);
    await expect(page.getByText('지금 이 방 사람들')).toHaveCount(0);
    await expect(page.getByText('이 방, 요즘 어때요')).toHaveCount(0);
    await expect(page.getByText('이 방 규칙')).toHaveCount(0);
    await page.screenshot({
      fullPage: true,
      path: `${qaDirectory}/room-${viewport.width}.png`,
    });

    expect(consoleErrors).toEqual([]);
  });
}

for (const delayedDependency of ['room', 'posts'] as const) {
  test(`ROOM slow ${delayedDependency} query keeps the three-story server summary visible until ready`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route(
      (url) =>
        delayedDependency === 'room'
          ? url.pathname.endsWith('/api/v1/community/rooms/8')
          : url.pathname.endsWith('/api/v1/community/posts') &&
            url.searchParams.get('roomId') === '8',
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        await route.continue();
      },
    );

    await page.goto('/community/rooms/8', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: '배포·운영방' }),
    ).toBeVisible();
    await expect(page.locator('article:visible')).toHaveCount(3);
    await expect(page.getByTestId('community-room-detail')).toBeHidden();

    await expect(page.getByTestId('community-room-detail')).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator('article:visible')).toHaveCount(3);
  });
}

test('ROOM empty posts response swaps the server stories for the explicit empty state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(
    (url) =>
      url.pathname.endsWith('/api/v1/community/posts') &&
      url.searchParams.get('roomId') === '8',
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        contentType: 'application/json',
        json: {
          content: {
            popularItems: [],
            items: [],
            page: 1,
            size: 0,
            totalElements: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false,
            totalPostCount: 0,
          },
        },
      });
    },
  );

  await page.goto('/community/rooms/8', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('article:visible')).toHaveCount(3);
  await expect(page.getByTestId('community-room-detail')).toBeHidden();
  await expect(page.getByTestId('community-room-posts-empty')).toBeVisible();
  await expect(page.locator('article:visible')).toHaveCount(0);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1024, height: 900 },
]) {
  test(`general community utility regression stays normal-flow with intersection 0 at ${viewport.width}px`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/community', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('service-content-root')).toBeVisible();
    await expectUtilityGeometry(page, 'relative', 56);

    const scrollMax = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    for (const top of [0, Math.round(scrollMax / 2), scrollMax]) {
      await page.evaluate((nextTop) => window.scrollTo(0, nextTop), top);
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(resolve)),
      );
      await expectNoUtilityIntersection(page);
    }

    await page.screenshot({
      fullPage: true,
      path: `${qaDirectory}/community-${viewport.width}.png`,
    });
    expect(consoleErrors).toEqual([]);
  });
}

test('SEA 390 라벨은 서로 겹치지 않고 승인 fixture 상태를 캡처한다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/insights', { waitUntil: 'networkidle' });

  const labels = page.getByTestId(/^island-label-/);
  // 바다에 그려지는 시작 섬은 8곳이다. 화면이 직접 "시작 섬 8개" 로 스스로를
  // 밝히고(insight-learning-map.tsx L393), dev 도 OCEAN 을 8곳만 준다
  // (2026-08-31 실측). 픽스처도 v0.9.4 에서 앞 8곳만 OCEAN 으로 바로잡혔다
  // (scripts/test/sprint8-fixture-server.mjs L247). 9 는 그 정정 전의 값이다.
  await expect(labels).toHaveCount(8);
  const boxes = await labels.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }),
  );

  boxes.forEach((box, index) => {
    boxes.slice(index + 1).forEach((other) => {
      const intersects =
        box.left < other.right &&
        box.right > other.left &&
        box.top < other.bottom &&
        box.bottom > other.top;

      expect(intersects).toBe(false);
    });
  });
  await page.screenshot({
    fullPage: true,
    path: `${qaDirectory}/sea-390.png`,
  });
  await page.setViewportSize({ width: 768, height: 900 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.screenshot({
    fullPage: true,
    path: `${qaDirectory}/sea-768.png`,
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.screenshot({
    fullPage: true,
    path: `${qaDirectory}/sea-1024.png`,
  });
});

test('SEA 390 opened 3개와 390·1024 limit 20은 card 교차·clipping이 없다', async ({
  page,
  request,
}) => {
  const fixtureResponse = await request.get(fixtureApi);
  const fixture = await fixtureResponse.json();
  let responseBody = fixture;
  await page.route('**/api/v1/insight/map', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseBody),
    }),
  );

  const openedThree = fixture.content.islands.map(
    (island: Record<string, unknown>, index: number) => ({
      ...island,
      progress:
        index === 0
          ? { conquered: false, conqueredAt: null, read: 1, total: 8 }
          : index <= 3
            ? { conquered: true, conqueredAt: '2026-08-04', read: 5, total: 5 }
            : { conquered: false, conqueredAt: null, read: 0, total: 5 },
    }),
  );
  responseBody = {
    ...fixture,
    content: { ...fixture.content, islands: openedThree },
  };
  // 바다에 카드로 깔리는 것은 시작 섬(OCEAN)뿐이고, 새로 열린 섬(NEW)은 아래
  // 격자에 링크로 간다(insight-learning-map.tsx L123-129 · L516-528). 그래서
  // 기대 개수는 응답에 든 OCEAN 개수여야 한다. 예전 하드코딩 9·20 은 tier 구분이
  // 픽스처에 들어오기 전 값이라 정상 화면에서도 어긋났다(2026-08-31 CI 실측:
  // Expected 9, Received 8).
  const oceanCount = (islandList: Array<Record<string, unknown>>) =>
    islandList.filter((island) => island.presentationTier === 'OCEAN').length;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/insights', { waitUntil: 'networkidle' });
  await expectNoCardCollisionOrClipping(page, oceanCount(openedThree));

  const sourceIslands = fixture.content.islands as Array<
    Record<string, unknown>
  >;
  const twentyIslands = Array.from({ length: 20 }, (_, index) => {
    const source = sourceIslands[index % sourceIslands.length];
    const bandProgress =
      index === 0
        ? { conquered: false, conqueredAt: null, read: 1, total: 8 }
        : index <= 3
          ? { conquered: true, conqueredAt: '2026-08-04', read: 5, total: 5 }
          : index <= 6
            ? { conquered: false, conqueredAt: null, read: 1, total: 5 }
            : { conquered: false, conqueredAt: null, read: 0, total: 5 };

    return {
      ...source,
      islandId: index + 101,
      name: `개척지 ${index + 1}`,
      slug: `stress-${index + 1}`,
      // tier 를 여기서 못박는다. 종전에는 원본 9곳을 20번 돌려쓰면서 tier 도 같이
      // 딸려와 OCEAN 이 18곳이 됐는데, 제품이 그런 상태를 만들지 않는다. 시작 섬은
      // 8곳으로 고정이고(화면이 "시작 섬 8개" 로 스스로를 밝힌다), 나머지는 전부
      // 새로 열린 섬 격자로 간다. 실제로 만들 수 없는 배치를 넣고 겹침을 물으면
      // 승인 설계가 약속한 적 없는 것을 요구하게 된다(2026-08-31 로컬 실측:
      // OCEAN 18곳이면 카드가 실제로 겹친다).
      // 섬 20곳이라는 부하 자체는 그대로다. 8곳은 카드로, 12곳은 격자로 깔린다.
      presentationTier: index < 8 ? 'OCEAN' : 'NEW',
      progress: bandProgress,
    };
  });
  responseBody = {
    ...fixture,
    content: { ...fixture.content, islands: twentyIslands },
  };

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload({ waitUntil: 'networkidle' });
    await expectNoCardCollisionOrClipping(page, oceanCount(twentyIslands));
    await page.screenshot({
      fullPage: true,
      path: `${qaDirectory}/sea-20-${viewport.width}.png`,
    });
  }
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1360, height: 900 },
]) {
  test(`${viewport.width}px SEA/LAND/READ/ROOM safe rail은 승인 geometry와 교차 0을 유지한다`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await page.setViewportSize(viewport);

    for (const screen of sprint8Screens) {
      await page.goto(screen.path, { waitUntil: 'networkidle' });
      if (screen.name === 'sea') {
        // 바다 화면에는 떠 있는 유틸리티 두 개를 **두지 않는다.** v0.9.4 가
        // ServiceFloatingClassActionButtons 에서 `/insights` 만 null 로
        // 돌려보내도록 바꿨다(floating-class-action-buttons.tsx L198).
        // 그 뒤로도 이 검사만 예전처럼 있다고 단언해 4개 뷰포트 전부 실패했다
        // (2026-08-31 CI 실측: element(s) not found).
        // 없는 것을 못 본 척 넘기지 않고, **없어야 한다**고 못박는다.
        await expect(page.getByTestId('service-utility-actions')).toHaveCount(
          0,
        );
      } else {
        const fixedAtWide =
          viewport.width === 1360 &&
          (screen.name === 'read' || screen.name === 'room');
        await expectUtilityGeometry(
          page,
          fixedAtWide ? 'fixed' : 'relative',
          fixedAtWide ? 70 : 56,
        );
      }

      const scrollMax = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      );
      for (const top of [0, Math.round(scrollMax / 2), scrollMax]) {
        await page.evaluate((nextTop) => window.scrollTo(0, nextTop), top);
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(resolve)),
        );
        await expectNoUtilityIntersection(page);
      }

      await page.screenshot({
        fullPage: true,
        path: `${qaDirectory}/safe-rail-${screen.name}-${viewport.width}.png`,
      });
    }

    expect(consoleErrors).toEqual([]);
  });
}
