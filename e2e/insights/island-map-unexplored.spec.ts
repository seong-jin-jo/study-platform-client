import { expect, test } from '@playwright/test';

// 2026-11-15 회장 지시: 글이 있는 NEW 섬도 지도에 보이고, 빈 섬은 "미개척" 으로
// 표시되며 눌렀을 때 들어가기 대신 "아직 개척되지 않은 섬" 안내가 뜬다.
test.describe('인사이트 섬 지도: 미개척 섬과 새 섬', () => {
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

  test('NEW 섬이 지도 버튼으로 보이고, 빈 섬은 미개척 안내를 띄운다', async ({
    page,
  }) => {
    const mapResponse = page.waitForResponse((res) =>
      /\/api\/v1\/insight\/map(\?|$)/.test(res.url()),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/insights', { waitUntil: 'domcontentloaded' });
    const body = await (await mapResponse).json();
    const islands = (body.content?.islands ?? []) as Array<{
      slug: string;
      presentationTier: string;
      articles: unknown[];
    }>;
    const worldmap = page.getByTestId('insight-worldmap');
    await expect(worldmap).toBeVisible({ timeout: 30_000 });

    for (const island of islands.filter((i) => i.presentationTier === 'NEW')) {
      await expect(
        worldmap.locator(`button[data-testid="island-${island.slug}"]`),
      ).toBeVisible();
    }

    const empty = islands.find((i) => i.articles.length === 0);
    test.skip(!empty, '빈 섬이 없는 데이터');
    if (!empty) return;
    await expect(
      worldmap.getByTestId(`island-progress-${empty.slug}`),
    ).toHaveText('미개척');
    await expect(worldmap.getByText('0편 중 0편 열림')).toHaveCount(0);

    await worldmap
      .locator(`button[data-testid="island-${empty.slug}"]`)
      .click();
    const dialog = worldmap.getByRole('dialog');
    await expect(dialog.getByTestId('island-unexplored-notice')).toBeVisible();
    await expect(
      dialog.getByRole('link', { name: /개척지 들어가기/ }),
    ).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: '닫기' })).toBeFocused();
  });
});
