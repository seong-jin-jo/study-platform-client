import { expect, test } from '@playwright/test';

// 2026-11-16 회장 확정: /insights 는 바다 지도 + 섬 선택 패널(PC 오른쪽, 휴대폰 아래 시트).
const VIEWPORTS = [
  { name: '휴대폰', width: 390, height: 844, sheet: true },
  { name: '태블릿', width: 820, height: 1180, sheet: true },
  { name: 'PC', width: 1280, height: 900, sheet: false },
] as const;

const SHOT_DIR = process.env.INSIGHT_SHOT_DIR;

const horizontalOverflow = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe('인사이트 섬 선택 패널', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // 로컬 빌드를 운영 API 에 붙여 돌릴 때만 쓴다(E2E_API_PROXY=1). 운영 API 는
  // localhost 출처를 CORS 로 막으므로 Playwright 가 대신 받아 넘긴다.
  test.beforeEach(async ({ page }) => {
    if (process.env.E2E_API_PROXY !== '1') return;
    await page.route(/https:\/\/api\.zeroone\.it\.kr\//, async (route) => {
      // 요청이 자격 증명을 실으므로 '*' 대신 요청 출처를 그대로 허용해야 한다.
      const cors = {
        'access-control-allow-origin':
          route.request().headers().origin ?? 'http://localhost:3000',
        'access-control-allow-credentials': 'true',
      };
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            ...cors,
            'access-control-allow-headers':
              route.request().headers()['access-control-request-headers'] ??
              '*',
            'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
          },
        });
        return;
      }
      const response = await route.fetch({
        headers: {
          ...route.request().headers(),
          origin: 'https://www.zeroone.it.kr',
        },
      });
      await route.fulfill({
        response,
        headers: { ...response.headers(), ...cors },
      });
    });
  });

  for (const vp of VIEWPORTS) {
    test(`${vp.name} ${vp.width}: 열린 섬 글 목록과 링크, 미개척 섬 안내, 가로 넘침 0`, async ({
      page,
    }) => {
      const mapResponse = page.waitForResponse((res) =>
        /\/api\/v1\/insight\/map(\?|$)/.test(res.url()),
      );
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/insights', { waitUntil: 'domcontentloaded' });
      const body = await (await mapResponse).json();
      const islands = (body.content?.islands ?? []) as Array<{
        slug: string;
        articles: Array<{ slug: string }>;
      }>;
      const worldmap = page.getByTestId('insight-worldmap');
      await expect(worldmap).toBeVisible({ timeout: 30_000 });
      // 오류 화면이 아니라 데이터 화면인지 먼저 단언한다.
      await expect(worldmap.getByText('바다를 불러오지 못했어요')).toHaveCount(
        0,
      );

      const opened = islands
        .filter((i) => i.articles.length > 0)
        .sort((a, b) => b.articles.length - a.articles.length);
      test.skip(opened.length === 0, '열린 섬이 없는 데이터');
      const target = opened[0];

      if (vp.sheet) {
        await expect(worldmap.getByTestId('island-sheet')).toHaveCount(0);
      } else {
        // PC: 첫 진입에 글이 가장 많은 섬이 이미 선택돼 있다.
        const first = worldmap.getByTestId('island-panel');
        await expect(first).toBeVisible();
        await expect(first.getByTestId('island-article-link')).not.toHaveCount(
          0,
        );
      }

      await worldmap
        .locator(`button[data-testid="island-${target.slug}"]`)
        .click();
      const surface = worldmap.getByTestId(
        vp.sheet ? 'island-sheet' : 'island-panel',
      );
      await expect(surface).toBeVisible();
      await expect(surface.getByTestId('island-keeper')).toContainText(
        '지킴이 모집 중',
      );
      await expect(surface.getByTestId('island-room')).toBeVisible();
      const links = surface.getByTestId('island-article-link');
      await expect(links.first()).toBeVisible();
      await expect(
        surface.getByRole('link', { name: /섬 들어가기/ }),
      ).toHaveAttribute('href', `/insights/land/${target.slug}`);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      if (SHOT_DIR) {
        await page.screenshot({
          path: `${SHOT_DIR}/open-${vp.width}x${vp.height}.png`,
        });
      }

      // 글 링크는 그 글 화면으로 간다.
      const articleHref = `/insights/${target.articles[0].slug}`;
      await expect(links.first()).toHaveAttribute('href', articleHref);
      await links.first().click();
      await page.waitForURL(`**${articleHref}`);
      await page.goto('/insights', { waitUntil: 'domcontentloaded' });
      await expect(worldmap).toBeVisible({ timeout: 30_000 });

      // 미개척 섬은 안내 문구만 보이고 들어가기 링크가 없다.
      const empty = islands.find((i) => i.articles.length === 0);
      if (!empty) return;
      await worldmap
        .locator(`button[data-testid="island-${empty.slug}"]`)
        .click();
      const second = worldmap.getByTestId(
        vp.sheet ? 'island-sheet' : 'island-panel',
      );
      await expect(
        second.getByTestId('island-unexplored-notice'),
      ).toBeVisible();
      await expect(second.getByTestId('island-enter')).toHaveCount(0);
      if (vp.sheet) {
        await expect(
          second.getByRole('button', { name: '닫기' }),
        ).toBeFocused();
      }
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      if (SHOT_DIR) {
        await page.screenshot({
          path: `${SHOT_DIR}/unexplored-${vp.width}x${vp.height}.png`,
        });
      }
    });
  }
});
