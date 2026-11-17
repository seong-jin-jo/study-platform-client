import { expect, test } from '@playwright/test';

// 애드센스 사이트 확인(2026-11-18): 메타 태그와 ads.txt 만 둔다. 광고 스크립트는 없다.
test.use({ storageState: { cookies: [], origins: [] } });

const PUB = '6725736681852729';

test.describe('애드센스 사이트 확인', () => {
  test('/ 의 head 에 google-adsense-account 메타가 있고 광고 스크립트는 없다', async ({
    page,
  }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(
      page.locator('head meta[name="google-adsense-account"]'),
    ).toHaveAttribute('content', `ca-pub-${PUB}`);
    // 위치 확정 전이라 자동 광고가 켜지지 않게 스크립트를 넣지 않는다.
    expect(
      await page.locator('script[src*="adsbygoogle"]').count(),
    ).toBe(0);
  });

  test('/ads.txt 는 200 이고 본문이 승인된 한 줄과 같다', async ({
    request,
  }) => {
    const response = await request.get('/ads.txt');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    expect((await response.text()).trim()).toBe(
      `google.com, pub-${PUB}, DIRECT, f08c47fec0942fa0`,
    );
  });

  test('경계: 메타는 / 와 하위 페이지에 각각 정확히 1개이고, ads.txt 는 한 줄·BOM 없음, robots 가 막지 않는다', async ({
    page,
    request,
  }) => {
    for (const path of ['/', '/privacy']) {
      await page.goto(path);
      await expect(
        page.locator('head meta[name="google-adsense-account"]'),
      ).toHaveCount(1);
    }

    const ads = await (await request.get('/ads.txt')).text();
    expect(ads.charCodeAt(0)).not.toBe(0xfeff);
    expect(ads.split('\n').filter((line) => line.trim() !== '')).toHaveLength(
      1,
    );

    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).not.toMatch(/^Disallow:\s*\/ads\.txt/m);
  });
});
