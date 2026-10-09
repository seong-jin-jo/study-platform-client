import { expect, type Page, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOM = {
  roomId: 7,
  cohortId: 7,
  slug: 'webapp-revenue',
  code: 'webapp-revenue',
  name: '첫 유료 유저 만들기',
  description: '첫 유료 고객을 만드는 실험을 나눕니다.',
  bannerUrl: null,
  axisTags: [
    { code: 'developer', label: '개발자', axis: 'JOB' },
    { code: 'webapp', label: '웹앱 수익화', axis: 'GOAL' },
    { code: 'beginner', label: '입문', axis: 'LEVEL' },
  ],
  jobAxis: [{ code: 'developer', label: '개발자', axis: 'JOB' }],
  goalAxis: [{ code: 'webapp', label: '웹앱 수익화', axis: 'GOAL' }],
  levelAxis: [{ code: 'beginner', label: '입문', axis: 'LEVEL' }],
  stats: { memberCount: 18, postCount7d: 4, commentCount7d: 9 },
  memberCount: 18,
  newPostsToday: 4,
  liveSignal: true,
  membership: { state: 'NONE', canJoin: true },
  rules: [],
  revision: 1,
};

const ROOM_HUB = {
  myRooms: [],
  exploreRooms: [ROOM],
  axes: {
    job: [
      { code: 'developer', label: '개발자' },
      { code: 'designer', label: '디자이너' },
    ],
    goal: [
      { code: 'webapp', label: '웹앱 수익화' },
      { code: 'portfolio', label: '포트폴리오' },
    ],
    level: [
      { code: 'beginner', label: '입문' },
      { code: 'intermediate', label: '중급' },
    ],
  },
  activeRoomCount: 0,
  activeRoomLimit: 3,
};

const ISLAND_NAMES = [
  '데이터베이스',
  '웹의 작동 원리',
  'API와 통신',
  '컴퓨터 구조',
  '배포와 운영',
  '네트워크 기초',
  '운영체제',
  '클라우드 입문',
];

const json = (content: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(content),
});

async function installPublicFixtures(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('zeroone-confirmed-anonymous', '1');
  });

  await page.route('**/api/v1/community/rooms**', async (route) => {
    await route.fulfill(json({ content: ROOM_HUB }));
  });
  await page.route('**/api/v1/community/posts**', async (route) => {
    await route.fulfill(
      json({
        content: {
          popularItems: [],
          items: [],
          page: 1,
          size: 5,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
          totalPostCount: 0,
        },
      }),
    );
  });
  await page.route('**/api/v1/home/public-feed**', async (route) => {
    await route.fulfill(
      json({
        content: {
          topInsights: [],
          activeRooms: [],
          newMembersWeek: { total: 0, byInterest: [] },
          hotQuestions: [],
        },
      }),
    );
  });
  await page.route('**/api/v1/insight/map**', async (route) => {
    await route.fulfill(
      json({
        content: {
          readingBudget: null,
          islands: ISLAND_NAMES.map((name, index) => ({
            islandId: index + 1,
            slug: `island-${index + 1}`,
            name,
            presentationTier: 'OCEAN',
            bridgeRoomId: null,
            progress: {
              read: 0,
              total: 1,
              conquered: false,
              conqueredAt: null,
            },
            explorerCount: 0,
            articles: [
              {
                documentId: `document-${index + 1}`,
                slug: `document-${index + 1}`,
                title: `${name} 첫 글`,
                description: '첫 글',
                coverUrl: null,
                level: 'BEGINNER',
                unlockCost: 0,
                required: true,
                state: null,
                socialProof: {
                  viewCount: 0,
                  helpfulCount: 0,
                  explorerCount: 0,
                  helpfulByMe: false,
                },
              },
            ],
          })),
        },
      }),
    );
  });
  await page.route('**/api/v1/koans**', async (route) => {
    await route.fulfill(
      json({
        content: {
          items: [],
          page: 1,
          size: 7,
          totalElements: 0,
          totalPages: 0,
        },
      }),
    );
  });
  await page.route('**/api/v5/courses**', async (route) => {
    await route.fulfill(
      json({
        content: {
          content: [
            {
              courseId: 1,
              slug: 'claude-cowork',
              title: '코딩없이 AI한테 일 맡기는 방법, 클로드 Cowork',
              headline: '실제 제공 상태를 확인합니다.',
              summary: '클로드 코워크 클래스',
              thumbnailUrl: '/community/rooms/home-hero-v3.jpg',
              status: 'COMING_SOON',
              tags: ['업무 자동화', '클로드'],
              learnerCount: 0,
              learnerLabel: '0명이 기다리는 중',
              regularPrice: null,
              discountPrice: null,
              ctaType: 'ALERT_SUBSCRIBE',
            },
          ],
        },
      }),
    );
  });
}

async function installEmptyRoomAxesFixture(page: Page) {
  await page.unroute('**/api/v1/community/rooms**');
  await page.route('**/api/v1/community/rooms**', async (route) => {
    await route.fulfill(
      json({
        content: {
          ...ROOM_HUB,
          axes: { job: [], goal: [], level: [] },
        },
      }),
    );
  });
}

async function expectNoNarrowTextColumns(page: Page) {
  const offenders = await page
    .locator('main')
    .first()
    .evaluate((main) => {
      const selectors = 'h1,h2,h3,p,span,a,button';
      return [...main.querySelectorAll<HTMLElement>(selectors)]
        .filter((element) => {
          const text = element.innerText.trim().replaceAll(/\s+/g, '');
          if (text.length < 4 || element.offsetParent === null) return false;
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          const fontSize = Number.parseFloat(style.fontSize);
          const lineHeight =
            Number.parseFloat(style.lineHeight) || fontSize * 1.5;
          return box.width < fontSize * 1.8 && box.height > lineHeight * 2.4;
        })
        .map((element) => ({
          text: element.innerText.trim().slice(0, 40),
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
        }));
    });
  expect(offenders).toEqual([]);
}

async function waitForVisibleImagesToPaint(page: Page) {
  await page.locator('main img:visible').evaluateAll(async (images) => {
    await Promise.all(
      images.map(async (image) => {
        if (!(image instanceof HTMLImageElement)) return;
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          });
        }
        if (image.naturalWidth > 0) await image.decode();
      }),
    );
  });
}

const CASES = [
  { path: '/', slug: 'home', heading: '[data-testid="mobile-home-hero"] h1' },
  {
    path: '/insights',
    slug: 'insights',
    heading: '[data-testid="insight-worldmap"] h2',
  },
  {
    path: '/community',
    slug: 'community',
    heading: '[data-testid="mobile-community-heading"]',
  },
  {
    path: '/class',
    slug: 'class',
    heading: '[data-testid="mobile-class-heading"] h1',
  },
];

const TABLET_CASES = [
  {
    path: '/',
    slug: 'home',
    heading: '[data-testid="tablet-home-hero"] h1',
  },
  {
    path: '/insights',
    slug: 'insights',
    heading: '[data-testid="insight-worldmap"] h2',
  },
  {
    path: '/community',
    slug: 'community',
    heading: '[data-testid="mobile-community-heading"]',
  },
  {
    path: '/class',
    slug: 'class',
    heading: '[data-testid="mobile-class-heading"] h1',
  },
];

const HEADER_SWEEP_WIDTHS = [
  ...Array.from({ length: 46 }, (_, index) => 360 + index * 20),
  1279,
];

test.describe('모바일 본문 승인 프레임 계약 390', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await installPublicFixtures(page);
  });

  for (const entry of CASES) {
    test(`${entry.path} 본문 제목, 가로 폭, 줄바꿈을 지킨다`, async ({
      page,
    }) => {
      await page.goto(entry.path, { waitUntil: 'domcontentloaded' });
      const heading = page.locator(entry.heading).first();
      await expect(heading).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      const headerBox = await page.locator('header').first().boundingBox();
      const headingBox = await heading.boundingBox();
      expect(headerBox).not.toBeNull();
      expect(headingBox).not.toBeNull();
      expect(headingBox!.y).toBeGreaterThanOrEqual(
        headerBox!.y + headerBox!.height,
      );
      expect(headingBox!.y + headingBox!.height).toBeLessThan(844);

      await expectNoNarrowTextColumns(page);

      if (entry.slug === 'home') {
        const mobileHero = page.getByTestId('mobile-home-hero');
        await expect(heading).toHaveText('혼자 막히지 않는 바이브코딩');
        await expect(
          mobileHero.getByText('같은 곳에서 막힌 사람이 이미 답을 남겼어요.'),
        ).toBeVisible();
        await expect(
          mobileHero.getByText('지금 4개 방에서 이야기가 오가는 중'),
        ).toBeVisible();
        const heroImage = mobileHero.locator('img').first();
        await expect
          .poll(() =>
            heroImage.evaluate((image) =>
              image instanceof HTMLImageElement ? image.naturalWidth : 0,
            ),
          )
          .toBeGreaterThan(0);
        await heroImage.evaluate((image) => {
          if (image instanceof HTMLImageElement) return image.decode();
        });
      }

      if (entry.slug === 'community') {
        await expect(
          page.locator('[data-testid^="community-room-filter-job-"]').first(),
        ).toBeVisible();
      }

      if (entry.slug === 'insights') {
        await expect(
          page.locator('[data-testid^="island-label-"]'),
        ).toHaveCount(8);
      }

      if (entry.slug === 'class') {
        await expect(
          page.getByTestId('mobile-class-card').first(),
        ).toBeVisible();
      }

      await waitForVisibleImagesToPaint(page);

      const captureDir = process.env.MOBILE_BODY_CAPTURE_DIR;
      if (captureDir) {
        mkdirSync(captureDir, { recursive: true });
        await page.screenshot({
          path: join(captureDir, `local-390-${entry.slug}.png`),
          fullPage: true,
        });
        await page.screenshot({
          path: join(captureDir, `local-390-${entry.slug}-viewport.png`),
        });
      }
    });
  }

  test('커뮤니티 3축 필터는 각 줄에 칩을 노출한다', async ({ page }) => {
    const privateRepRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.endsWith('/rep/me')) {
        privateRepRequests.push(request.url());
      }
    });

    await page.goto('/community', { waitUntil: 'domcontentloaded' });
    for (const axis of ['job', 'goal', 'level']) {
      const chips = page.locator(
        `[data-testid^="community-room-filter-${axis}-"]`,
      );
      await expect(chips.first()).toBeVisible();
      expect(await chips.count()).toBeGreaterThan(0);
    }
    const resultSummary = page
      .getByTestId('community-room-filter-panel')
      .locator('p')
      .last();
    await expect(resultSummary).toContainText('둘러볼 수 있는 방 1개');
    await page
      .locator('[data-testid^="community-room-filter-job-"]')
      .first()
      .click();
    await expect(resultSummary).toContainText('고른 조건에 맞는 방 1개');
    expect(privateRepRequests).toEqual([]);
  });

  test('운영 모양의 빈 커뮤니티 필터 축은 라벨과 칩 대신 안내를 보인다', async ({
    page,
  }) => {
    await installEmptyRoomAxesFixture(page);
    await page.goto('/community', { waitUntil: 'domcontentloaded' });

    const panel = page.getByTestId('community-room-filter-panel');
    await expect(
      panel.getByTestId('community-room-filter-empty'),
    ).toBeVisible();
    await expect(panel.getByText('직군', { exact: true })).toHaveCount(0);
    await expect(panel.getByText('목표', { exact: true })).toHaveCount(0);
    await expect(panel.getByText('난이도', { exact: true })).toHaveCount(0);
    for (const axis of ['job', 'goal', 'level']) {
      await expect(
        panel.locator(`[data-testid^="community-room-filter-${axis}-"]`),
      ).toHaveCount(0);
    }

    const captureDir = process.env.MOBILE_BODY_CAPTURE_DIR;
    if (captureDir) {
      mkdirSync(captureDir, { recursive: true });
      await page.screenshot({
        path: join(captureDir, 'local-390-community-empty-axes.png'),
      });
    }
  });

  test('홈 주 CTA는 승인 대비색을 쓰고 인사이트로 이동한다', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const cta = page.getByTestId('mobile-home-primary-cta');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveCSS('background-color', 'rgb(227, 27, 84)');
    await cta.click();
    await expect(page).toHaveURL(/\/insights$/);
  });

  test('커뮤니티 모바일은 숨긴 데스크톱 히어로 이미지를 요청하지 않는다', async ({
    page,
  }) => {
    const heroRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('home-hero-v3.jpg')) {
        heroRequests.push(request.url());
      }
    });

    await page.goto('/community', { waitUntil: 'networkidle' });
    expect(heroRequests).toEqual([]);
  });

  test('클래스 썸네일은 카드 폭 안에 온전히 들어간다', async ({ page }) => {
    await page.goto('/class', { waitUntil: 'domcontentloaded' });
    const card = page.getByTestId('mobile-class-card').first();
    const thumbnail = page.getByTestId('mobile-class-thumbnail').first();
    const image = thumbnail.locator('img').first();
    await expect(card).toBeVisible();
    await expect(thumbnail).toBeVisible();
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate((element) =>
          element instanceof HTMLImageElement ? element.naturalWidth : 0,
        ),
      )
      .toBeGreaterThan(0);
    const cardBox = await card.boundingBox();
    const thumbnailBox = await thumbnail.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(thumbnailBox).not.toBeNull();
    expect(thumbnailBox!.x).toBeGreaterThanOrEqual(cardBox!.x);
    expect(thumbnailBox!.x + thumbnailBox!.width).toBeLessThanOrEqual(
      cardBox!.x + cardBox!.width,
    );
    expect(
      await image.evaluate((element) => getComputedStyle(element).objectFit),
    ).toBe('contain');
  });

  test('인사이트 섬 라벨은 한 줄을 유지한다', async ({ page }) => {
    await page.goto('/insights', { waitUntil: 'domcontentloaded' });
    const labels = page.locator('[data-testid^="island-label-"]');
    await expect(labels.first()).toBeVisible();
    for (const label of await labels.all()) {
      const box = await label.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeLessThanOrEqual(24);
    }

    const progressLabels = page.locator('[data-testid^="island-progress-"]');
    await expect(progressLabels).toHaveCount(8);
    for (const progress of await progressLabels.all()) {
      await expect(progress).toBeVisible();
      const box = await progress.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeLessThanOrEqual(20);
    }
  });
});

test.describe('태블릿 본문 승인 프레임 계약 768~1023', () => {
  test.beforeEach(async ({ page }) => {
    await installPublicFixtures(page);
  });

  test('360~1279 헤더 메뉴는 한 줄이며 가로 넘침이 없다', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const tabletHeaderHeights: number[] = [];

    for (const width of HEADER_SWEEP_WIDTHS) {
      await page.setViewportSize({ width, height: 844 });

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px 가로 넘침`).toBeLessThanOrEqual(1);

      if (width >= 768) {
        const metrics = await page
          .locator('header')
          .first()
          .evaluate((header) => {
            const items = [
              ...header.querySelectorAll<HTMLElement>(
                'nav a, nav > div > span',
              ),
            ].filter((element) => element.offsetParent !== null);
            return {
              headerHeight: header.getBoundingClientRect().height,
              items: items.map((element) => {
                const style = getComputedStyle(element);
                const lineTops: number[] = [];
                const walker = document.createTreeWalker(
                  element,
                  NodeFilter.SHOW_TEXT,
                  {
                    acceptNode: (node) =>
                      node.textContent?.trim()
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_REJECT,
                  },
                );
                let textNode = walker.nextNode();
                while (textNode) {
                  const range = document.createRange();
                  range.selectNodeContents(textNode);
                  for (const rect of range.getClientRects()) {
                    if (rect.width > 0 && rect.height > 0) {
                      lineTops.push(rect.top);
                    }
                  }
                  range.detach();
                  textNode = walker.nextNode();
                }

                const lineCount = lineTops
                  .sort((a, b) => a - b)
                  .filter(
                    (top, index, tops) =>
                      index === 0 || Math.abs(top - tops[index - 1]) > 1,
                  ).length;
                return {
                  text: element.innerText,
                  lineCount,
                  whiteSpace: style.whiteSpace,
                };
              }),
            };
          });

        tabletHeaderHeights.push(metrics.headerHeight);
        expect(metrics.items, `${width}px GNB 항목`).toHaveLength(4);
        for (const item of metrics.items) {
          expect(item.whiteSpace, `${width}px ${item.text}`).toBe('nowrap');
          expect(item.lineCount, `${width}px ${item.text} 텍스트 줄 수`).toBe(
            1,
          );
        }
      }
    }

    expect(
      Math.max(...tabletHeaderHeights) - Math.min(...tabletHeaderHeights),
    ).toBeLessThanOrEqual(1);
  });

  for (const viewportWidth of [780, 800, 820, 1000]) {
    for (const entry of TABLET_CASES) {
      test(`${viewportWidth} ${entry.path} 제목과 승인 태블릿 본문을 첫 화면에 보인다`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewportWidth, height: 1180 });
        await page.goto(entry.path, { waitUntil: 'domcontentloaded' });

        const heading = page.locator(entry.heading).first();
        await expect(heading).toBeVisible();
        const headerBox = await page.locator('header').first().boundingBox();
        const headingBox = await heading.boundingBox();
        expect(headerBox).not.toBeNull();
        expect(headingBox).not.toBeNull();
        if (!headerBox || !headingBox) {
          throw new Error(
            `${viewportWidth}px ${entry.path} 위치를 측정하지 못했습니다.`,
          );
        }
        expect(headingBox.y).toBeGreaterThanOrEqual(
          headerBox.y + headerBox.height,
        );
        expect(headingBox.y + headingBox.height).toBeLessThan(1180);

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
        await expectNoNarrowTextColumns(page);

        if (entry.slug === 'home') {
          await expect(page.getByTestId('tablet-home-hero')).toBeVisible();
        }

        await waitForVisibleImagesToPaint(page);
        const captureDir = process.env.TABLET_BODY_CAPTURE_DIR;
        if (captureDir) {
          mkdirSync(captureDir, { recursive: true });
          await page.screenshot({
            path: join(
              captureDir,
              `local-${viewportWidth}-${entry.slug}-viewport.png`,
            ),
          });
        }
      });
    }
  }
});

const wideCaptureDir = process.env.MOBILE_BODY_WIDE_CAPTURE_DIR;

if (wideCaptureDir) {
  test.describe('820·1280 본문 회귀 캡처', () => {
    test.beforeEach(async ({ page }) => {
      await installPublicFixtures(page);
    });

    for (const viewportWidth of [820, 1280]) {
      for (const entry of CASES) {
        test(`${viewportWidth} ${entry.path} 전체 페이지를 캡처한다`, async ({
          page,
        }) => {
          await page.setViewportSize({ width: viewportWidth, height: 984 });
          await page.goto(entry.path, { waitUntil: 'domcontentloaded' });
          await expect(page.locator('main').first()).toBeVisible();
          await page.waitForLoadState('networkidle');
          if (entry.slug === 'community') {
            await expect(
              page
                .locator('[data-testid^="community-room-filter-job-"]')
                .first(),
            ).toBeVisible();
          }
          if (entry.slug === 'insights') {
            await expect(
              page.locator('[data-testid^="island-label-"]'),
            ).toHaveCount(8);
          }
          if (entry.slug === 'class') {
            await expect(
              page.getByTestId('mobile-class-card').first(),
            ).toBeVisible();
          }
          await waitForVisibleImagesToPaint(page);
          await page.addStyleTag({
            content:
              '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
          });
          await page.screenshot({
            path: join(wideCaptureDir!, `${viewportWidth}-${entry.slug}.png`),
            fullPage: true,
          });
        });
      }
    }
  });
}
