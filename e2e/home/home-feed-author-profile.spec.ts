import { expect, test } from '@playwright/test';

// 2026-11-15 회장 지시: "커뮤니티 지금 홈에 나와 있는 글 보면은 그 프로필이 클릭이
// 안 되는데 그게 가능하게끔". 홈 피드 카드의 글쓴이 이름이 공개 프로필을 연다.
test.describe('홈 피드: 글쓴이 프로필 열기', () => {
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

  test('글쓴이 이름을 누르면 공개 프로필 창이 열린다', async ({ page }) => {
    await page.goto('/');
    // 피드가 정렬을 마치기 전에 누르면 다시 그려진 카드에 클릭이 빠진다.
    await page.waitForLoadState('networkidle');
    const author = page.getByTestId('home-feed-author-link').first();
    await expect(author).toBeVisible({ timeout: 20_000 });
    const href = await author.getAttribute('href');
    expect(href).toMatch(/^\/members\/[0-9a-f-]{36}$/);
    await author.scrollIntoViewIfNeeded();
    await author.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('공개 프로필');
  });
});
