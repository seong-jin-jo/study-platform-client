// biome-ignore assist/source/organizeImports: repository ESLint import/order is authoritative.
import {
  PROTOTYPE_PATH,
  prototypeAvailable,
  prototypeMissingReason,
} from '../support/prototype-path';

const prototypePath = PROTOTYPE_PATH;
import { expect, type Page, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { resolveBuildCompareOutputRoot } from '../support/build-compare-output';
import {
  API_BASE_URL,
  authenticatePage,
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

const SEARCH_QUERY = process.env.E2E_SPRINT7_SEARCH_QUERY ?? '배포';

// 저장 위치는 공용 헬퍼가 정한다. CI 는 study-platform-client 하나만
// 컨테이너에 마운트하므로 저장소 루트의 docs/ 는 존재하지 않는다.
// 앞서 파일 위치 기준으로 바꿔봤지만 같은 이유로 못 쓴다.
const outputRoot = resolveBuildCompareOutputRoot('dev-home-search');

const saveViewportShot = async (
  page: Page,
  screen: string,
  mode: 'mobile' | 'desktop',
) => {
  const directory = path.join(outputRoot, screen);
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `impl-${mode}.png`),
    fullPage: false,
  });
};

test.skip(!prototypeAvailable, prototypeMissingReason);

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

test.describe('Sprint7 v3 홈, 검색, 광고 슬롯', () => {
  test.beforeEach(async ({ page, request }) => {
    await Promise.all(
      ['home', 'search', 'ads', 'redditcut', 'expand'].map((screen) =>
        mkdir(path.join(outputRoot, screen), { recursive: true }),
      ),
    );
    await authenticatePage(page, request);
  });

  test('홈 피드가 2페이지를 불러오고 승인 문구와 광고 슬롯을 유지한다', async ({
    page,
  }) => {
    const requestedCursors: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/v1/home/feed') {
        requestedCursors.push(url.searchParams.get('cursor') ?? 'first');
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(
      page.getByRole('heading', { name: /혼자 막히지 않는/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: '많이 도움된 글' }).click();
    await expect(page.getByText('답변 달리는 중').first()).toBeVisible();
    await expect(page.getByText(/명이 다녀갔어요/).first()).toBeVisible();
    await expect(
      page.getByText('최근 같은 방 멤버가 답을 보고 있어요').first(),
    ).toBeVisible();
    await expect(page.getByTestId('home-ad-slot').first()).toBeVisible();
    const firstPageCount = await page.getByTestId('home-feed-card').count();
    expect(firstPageCount).toBeGreaterThan(0);

    const loadMore = page.getByTestId('home-feed-load-more');
    await expect(loadMore).toBeVisible();
    await loadMore.scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.getByTestId('home-feed-card').count())
      .toBeGreaterThan(firstPageCount);
    expect(requestedCursors.some((cursor) => cursor !== 'first')).toBe(true);

    await saveViewportShot(page, 'home', 'mobile');
    await page
      .getByTestId('home-feed-card')
      .first()
      .screenshot({
        path: path.join(outputRoot, 'redditcut', 'impl-mobile.png'),
      });
    await page
      .getByTestId('home-feed-card')
      .first()
      .screenshot({
        path: path.join(outputRoot, 'expand', 'impl-mobile.png'),
      });
    await page
      .getByTestId('home-ad-slot')
      .first()
      .screenshot({
        path: path.join(outputRoot, 'ads', 'impl-mobile.png'),
      });
    await expect(page.getByRole('button', { name: '더보기' })).toHaveCount(0);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'networkidle' });
    await saveViewportShot(page, 'home', 'desktop');
    await page
      .getByTestId('home-feed-card')
      .first()
      .screenshot({
        path: path.join(outputRoot, 'redditcut', 'impl-desktop.png'),
      });
    await page
      .getByTestId('home-feed-card')
      .first()
      .screenshot({
        path: path.join(outputRoot, 'expand', 'impl-desktop.png'),
      });
    await page
      .getByTestId('home-ad-slot')
      .first()
      .screenshot({
        path: path.join(outputRoot, 'ads', 'impl-desktop.png'),
      });
  });

  test('검색 결과가 홈 뼈대 안에서 커뮤니티와 인사이트를 함께 보여준다', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const searchResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/v1/search' && response.status() === 200;
    });
    await page.goto(`/search?q=${encodeURIComponent(SEARCH_QUERY)}`, {
      waitUntil: 'networkidle',
    });
    const searchBody = (await (await searchResponse).json()) as {
      content: { items: Array<{ type: string }> };
    };
    const expectedItems = searchBody.content.items;
    expect(expectedItems.some((item) => item.type === 'COMMUNITY_POST')).toBe(
      true,
    );
    expect(expectedItems.some((item) => item.type === 'INSIGHT_ARTICLE')).toBe(
      true,
    );
    await expect(page.getByTestId('search-result-card')).toHaveCount(
      expectedItems.length,
    );
    await expect(page.getByText('내 활동')).toBeVisible();
    await saveViewportShot(page, 'search', 'mobile');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'networkidle' });
    await saveViewportShot(page, 'search', 'desktop');
  });

  test('검색 빈 결과가 승인된 빈 상태 문구를 보여준다', async ({ page }) => {
    await page.goto('/search?q=결과없음', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: '"결과없음"으로 나온 글이 없어요' }),
    ).toBeVisible();
  });

  test('검색 로딩과 오류 상태를 각각 노출한다', async ({ page }) => {
    await page.route(`${API_BASE_URL}/api/v1/search**`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await page.goto('/search?q=로딩상태', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('검색 중')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /"로딩상태"으로 나온 글이 없어요/ }),
    ).toBeVisible();

    await page.unroute(`${API_BASE_URL}/api/v1/search**`);
    await page.route(`${API_BASE_URL}/api/v1/search**`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'controlled search failure' }),
      }),
    );

    await page.goto('/search?q=오류상태', { waitUntil: 'networkidle' });
    await expect(
      page.getByRole('heading', { name: '검색이 잠깐 안 되고 있어요' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
  });
});

test('승인 프로토타입의 담당 화면을 두 뷰포트로 보존한다', async ({ page }) => {
  const screens = ['home', 'search', 'ads', 'redditcut', 'expand'] as const;

  await page.goto(`file://${prototypePath}`);

  for (const mode of ['mobile', 'desktop'] as const) {
    await page.setViewportSize(
      mode === 'mobile'
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    );

    for (const screen of screens) {
      await page.evaluate(
        ({ screenId, viewport }) => {
          const stage = document.querySelector('#stage');
          if (stage) {
            stage.className = `stage vp-${viewport}`;
          }
          document.querySelectorAll('.screen').forEach((element) => {
            element.classList.toggle('on', element.id === `scr-${screenId}`);
          });
        },
        { screenId: screen, viewport: mode === 'mobile' ? '390' : '1280' },
      );

      const target = page.locator(`#scr-${screen}`);
      await expect(target).toBeVisible();
      const directory = path.join(outputRoot, screen);
      await mkdir(directory, { recursive: true });
      await target.screenshot({
        path: path.join(directory, `proto-${mode}.png`),
      });
    }
  }
});
