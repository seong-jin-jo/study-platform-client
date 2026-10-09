import {
  fixtureApiReachable,
  fixtureMissingReason,
} from '../support/fixture-api';
import { type APIRequestContext, expect, test } from '@playwright/test';

// 픽스처 API 주소는 러너가 넘긴다(scripts/e2e/run-sprint8-fixture-e2e.sh).
// 여기에 포트를 박아두면 SPRINT8_FIXTURE_PORT 로 포트를 옮겨 돌릴 때
// 이 스펙만 옛 포트로 붙어 ECONNREFUSED 로 죽는다. e2e/support/fixture-api.ts
// 와 같은 환경변수를 본다.
const fixtureOrigin =
  process.env.E2E_FIXTURE_API_BASE?.trim() ?? 'http://127.0.0.1:3290';
const profilePath = '/members/11111111-1111-4111-8111-111111111111';

const sitemapUrls = async (request: APIRequestContext) => {
  const root = await request.get('/sitemap.xml');
  expect(root.status()).toBe(200);
  const shardUrls = [
    ...(await root.text()).matchAll(/<loc>([^<]+)<\/loc>/g),
  ].map((match) => match[1]);
  const urls: string[] = [];
  for (const shardUrl of shardUrls) {
    const path = new URL(shardUrl).pathname;
    const shard = await request.get(path);
    expect(shard.status(), path).toBe(200);
    urls.push(
      ...[...(await shard.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (match) => match[1],
      ),
    );
  }
  return urls;
};

const mutate = async (request: APIRequestContext, action: string) => {
  const response = await request.post(
    `${fixtureOrigin}/__control/lifecycle/${action}`,
  );
  expect(response.status()).toBe(200);
};

const expectFirstHtmlRscNotFound = async (
  request: APIRequestContext,
  path: string,
  previousResourceMarker: string,
) => {
  const html = await request.get(path, { maxRedirects: 0 });
  expect(html.status(), `${path} HTML`).toBe(404);
  expect(html.headers()['cache-control'], `${path} HTML`).toContain('no-store');
  const htmlBody = await html.text();
  expect(htmlBody, `${path} HTML previous resource`).not.toContain(
    previousResourceMarker,
  );
  const rsc = await request.get(path, {
    headers: { RSC: '1', 'Next-Router-State-Tree': '["",{}]' },
    maxRedirects: 0,
  });
  expect(rsc.status(), `${path} RSC`).toBe(200);
  expect(rsc.headers()['content-type'], `${path} RSC`).toContain(
    'text/x-component',
  );
  expect(rsc.headers()['cache-control'], `${path} RSC`).toContain('no-store');
  const flight = await rsc.text();
  expect(flight, `${path} RSC not-found boundary`).toContain(
    '페이지를 찾을 수 없습니다',
  );
  expect(flight, `${path} RSC 404 digest`).toContain(
    'NEXT_HTTP_ERROR_FALLBACK;404',
  );
  expect(flight, `${path} RSC previous resource`).not.toContain(
    previousResourceMarker,
  );
};

let fixtureReady = false;
test.beforeAll(async () => {
  fixtureReady = await fixtureApiReachable();
});
test.beforeEach(() => {
  test.skip(!fixtureReady, fixtureMissingReason);
});

test.describe('Sprint8 lifecycle first-request convergence', () => {
  test.beforeEach(async ({ request }) => {
    // 픽스처 서버가 없으면 여기서 멈춘다. 파일 최상단 가드만 두었더니
    // 이 reset 호출이 먼저 나가 ECONNREFUSED 로 죽었다(2026-08-21 실측).
    test.skip(!fixtureReady, fixtureMissingReason);
    await mutate(request, 'reset');
  });

  test.afterEach(async ({ request }) => {
    if (!fixtureReady) return;
    await mutate(request, 'reset');
  });

  test('inactive profile is 404 and absent from the first regenerated sitemap', async ({
    request,
  }) => {
    expect((await request.get(profilePath)).status()).toBe(200);
    await mutate(request, 'profile-inactive');
    await expectFirstHtmlRscNotFound(request, profilePath, '새로온 개척자');
    expect(await sitemapUrls(request)).not.toContain(
      `https://www.zeroone.it.kr${profilePath}`,
    );
  });

  test('soft-deleted post is 404 and absent from the first regenerated sitemap', async ({
    request,
  }) => {
    expect((await request.get('/community/801')).status()).toBe(200);
    await mutate(request, 'post-801-delete');
    await expectFirstHtmlRscNotFound(
      request,
      '/community/801',
      '무중단 배포라는데 30초쯤 502가 뜹니다',
    );
    expect(await sitemapUrls(request)).not.toContain(
      'https://www.zeroone.it.kr/community/801',
    );
  });

  test('archived room and linked post are 404 and absent from the first sitemap', async ({
    request,
  }) => {
    await mutate(request, 'room-8-archive');
    await expectFirstHtmlRscNotFound(
      request,
      '/community/rooms/8',
      '배포·운영방',
    );
    await expectFirstHtmlRscNotFound(
      request,
      '/community/801',
      '무중단 배포라는데 30초쯤 502가 뜹니다',
    );
    const urls = await sitemapUrls(request);
    expect(urls).not.toContain('https://www.zeroone.it.kr/community/rooms/8');
    expect(urls).not.toContain('https://www.zeroone.it.kr/community/801');
  });

  test('retracted koan is 404 and absent from the first regenerated sitemap', async ({
    request,
  }) => {
    expect((await request.get('/insights/koans/1')).status()).toBe(200);
    await mutate(request, 'koan-1-retract');
    await expectFirstHtmlRscNotFound(
      request,
      '/insights/koans/1',
      '프로젝트 SSH 키가 이미 있는데 인스턴스 키를 더하면, 둘은 공존할까 덮어쓸까?',
    );
    expect(await sitemapUrls(request)).not.toContain(
      'https://www.zeroone.it.kr/insights/koans/1',
    );
  });

  test('RSC lifecycle navigation renders the client not-found boundary and removes the previous route', async ({
    page,
    request,
  }) => {
    const path = '/insights/koans/1';
    const previousResourceMarker =
      '프로젝트 SSH 키가 이미 있는데 인스턴스 키를 더하면, 둘은 공존할까 덮어쓸까?';
    await page.goto('/insights/koans', { waitUntil: 'networkidle' });
    await mutate(request, 'koan-1-retract');
    const koanLink = page.locator(`a[href="${path}"]`).first();
    await expect(koanLink).toBeVisible();

    const [flightResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === path &&
          response.headers()['content-type']?.includes('text/x-component'),
      ),
      koanLink.click(),
    ]);

    expect(flightResponse.status()).toBe(200);
    expect(flightResponse.headers()['content-type']).toContain(
      'text/x-component',
    );
    await expect(page).toHaveURL(path);
    await expect(page.locator('body')).toContainText(/404|찾을 수/);
    await expect(page.locator('body')).not.toContainText(
      previousResourceMarker,
    );
  });
});
