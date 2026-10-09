import {
  fixtureApiReachable,
  fixtureMissingReason,
} from '../support/fixture-api';
import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/insights',
  '/insights/land/dep',
  '/insights/koans',
  '/insights/koans/1',
  '/insights/dep-article-1',
  '/insights/dep-article-2',
  '/community/questions/101',
  '/community/rooms/8',
  '/community/801',
  '/members/11111111-1111-4111-8111-111111111111',
] as const;
const fixtureApiBase = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3290';

let fixtureReady = false;
test.beforeAll(async () => {
  fixtureReady = await fixtureApiReachable();
});
test.beforeEach(() => {
  test.skip(!fixtureReady, fixtureMissingReason);
});

for (const width of [390, 1024] as const) {
  test(`public SEO pages render at ${width}px without console errors`, async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    const failedResponses: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      const isExpectedAnonymousRefresh =
        response.status() === 401 &&
        response.url().endsWith('/api/v1/auth/access-token/refresh');
      if (response.status() >= 400 && !isExpectedAnonymousRefresh) {
        failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.setViewportSize({ width, height: 900 });

    for (const route of publicRoutes) {
      const response = await page.goto(route, {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('h1').first(), route).toBeVisible();
      await expect(page.locator('link[rel="canonical"]'), route).toHaveCount(1);
      expect(await page.content(), route).not.toContain('LOCKED_CANARY_9f31');
      if (route === '/insights/dep-article-2') {
        await expect(page.getByText('2번째 물길')).toBeVisible();
        await expect(
          page.getByRole('link', { name: /물길 없이 읽는 화두 보기/ }),
        ).toHaveAttribute('href', '/insights/koans/1');
      }
    }

    expect({ errors, failedResponses }).toEqual({
      errors: [],
      failedResponses: [],
    });
  });
}

test('crawler HTML, RSC, robots, and every generated sitemap shard stay public-safe', async ({
  request,
}) => {
  const crawlerHeaders = { 'User-Agent': 'Googlebot/2.1' };
  for (const route of publicRoutes) {
    const html = await request.get(route, { headers: crawlerHeaders });
    expect(html.status(), route).toBe(200);
    expect(html.headers()['cache-control'], route).toContain('no-store');
    expect(html.headers().age, route).toBeUndefined();
    expect(html.headers()['set-cookie'], route).toBeUndefined();
    const text = await html.text();
    expect(text, route).toContain('rel="canonical"');
    expect(text, route).not.toContain('LOCKED_CANARY_9f31');
    expect(text, route).not.toContain('team@zeroone.it.kr');
    expect(text, route).not.toContain('opsNote');
    expect(text, route).not.toContain('gatedBodyHtml');

    const rsc = await request.get(route, {
      headers: { ...crawlerHeaders, RSC: '1' },
    });
    expect(rsc.status(), `${route} RSC`).toBe(200);
    expect(rsc.headers()['cache-control'], `${route} RSC`).toContain(
      'no-store',
    );
    expect(rsc.headers().age, `${route} RSC`).toBeUndefined();
    expect(rsc.headers()['set-cookie'], `${route} RSC`).toBeUndefined();
    const flight = await rsc.text();
    expect(flight, `${route} RSC`).not.toContain('LOCKED_CANARY_9f31');
    expect(flight, `${route} RSC`).not.toContain('team@zeroone.it.kr');
    expect(flight, `${route} RSC`).not.toContain('gatedBodyHtml');
  }

  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  expect(robotsText).toContain(
    'Sitemap: https://www.zeroone.it.kr/sitemap.xml',
  );

  const index = await request.get('/sitemap.xml');
  expect(index.status()).toBe(200);
  expect(index.headers()['cache-control']).toBe('no-store');
  const indexText = await index.text();
  const shardPaths = [
    ...indexText.matchAll(/<loc>https:\/\/www\.zeroone\.it\.kr([^<]+)<\/loc>/g),
  ].map((match) => match[1]);
  expect(shardPaths.length).toBeGreaterThanOrEqual(8);
  for (const shardPath of shardPaths) {
    const shard = await request.get(shardPath);
    expect(shard.status(), shardPath).toBe(200);
    expect(shard.headers()['cache-control'], shardPath).toBe('no-store');
    expect(await shard.text(), shardPath).toContain('<urlset');
  }
});

test('invalid public SEO paths fail closed and the weekly alias has one canonical destination', async ({
  request,
}) => {
  for (const [route, expectedStatus] of [
    ['/insights/%2e%2e%2fadmin', 400],
    ['/members/not-a-uuid', 404],
    ['/community/questions/%2e%2e%2f801', 400],
    ['/members/not-a-uuid%0d%0aLocation:%20/admin', 400],
  ] as const) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(expectedStatus);
    expect(response.headers().location, route).toBeUndefined();
    expect(response.headers()['cache-control'], route).toBe('no-store');
    const body = await response.text();
    expect(body, route).not.toContain('Error:');
    expect(body, route).not.toContain('/Users/');
    expect(body, route).not.toContain('Location:');
  }

  const alias = await request.get('/insights/weekly?category=dep', {
    maxRedirects: 0,
  });
  expect(alias.status()).toBe(308);
  expect(alias.headers().location).toBe('/insights');

  const canonical = await request.get('/insights');
  expect(canonical.status()).toBe(200);
  expect(await canonical.text()).toContain(
    'rel="canonical" href="https://www.zeroone.it.kr/insights"',
  );

  const sitemap = await request.get('/sitemap.xml');
  const sitemapText = await sitemap.text();
  expect(sitemapText).not.toContain('/insights/weekly');
});

test('HTML and RSC return an empty retryable 503 before streaming and recover on the first request', async ({
  request,
}) => {
  const route = '/insights/dep-article-1';
  expect((await request.get(route)).status()).toBe(200);

  const fail = await request.post(
    `${fixtureApiBase}/__control/public-seo-upstream/fail`,
  );
  expect(fail.status()).toBe(200);
  try {
    const failureHeaders: Array<Record<string, string>> = [
      { Accept: 'text/html' },
      { RSC: '1', 'Next-Router-State-Tree': '["",{}]' },
    ];
    for (const headers of failureHeaders) {
      const response = await request.get(route, { headers, maxRedirects: 0 });
      expect(response.status()).toBe(503);
      expect(response.headers()['retry-after']).toBe('60');
      expect(response.headers()['cache-control']).toBe('no-store');
      expect(response.headers().location).toBeUndefined();
      const body = await response.text();
      expect(body).toBe('');
    }
  } finally {
    const recover = await request.post(
      `${fixtureApiBase}/__control/public-seo-upstream/recover`,
    );
    expect(recover.status()).toBe(200);
  }

  const recovered = await request.get(route);
  expect(recovered.status()).toBe(200);
  expect(await recovered.text()).toContain(
    'rel="canonical" href="https://www.zeroone.it.kr/insights/dep-article-1"',
  );
});
