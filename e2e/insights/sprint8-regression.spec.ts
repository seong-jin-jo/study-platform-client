import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from '@playwright/test';
import { qnaFixtureUnreadable } from '../support/sprint8-preconditions';

const WEB_BASE_URL = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  // 식별자가 없는 것은 **제품 결함이 아니라 검증 전제가 안 갖춰진 것**이다.
  // 예전에는 여기서 throw 해서 실패로 잡혔고, 그 실패가 진짜 결함과 같은 칸에
  // 섞여 34건 중 무엇이 결함인지 구분이 안 됐다(2026-08-21).
  // qa-plan-sprint8-v1.0.0.md §2 규칙대로 **미실시(사유)** 로 남긴다.
  // 통과로 올리는 것이 아니라, 안 돌았다는 사실과 이유를 그대로 드러낸다.
  test.skip(
    !value,
    `${name} 미설정이라 이 케이스는 실행할 수 없다(미실시). ` +
      '값 정본은 e2e/sprint8-identifiers.env 이고, 아직 못 채운 값은 그 파일 하단에 사유와 함께 적혀 있다.',
  );
  return value as string;
}

/**
 * 있으면 쓰고 없으면 그 단언만 건너뛰는 값.
 *
 * requiredEnv 는 값이 없으면 **테스트 전체를** 미실시로 만든다. 그런데 dev 실데이터에서
 * 못 뽑는 값 하나 때문에 나머지 단언까지 통째로 안 도는 경우가 있었다(2026-08-26 실측:
 * 본문 조각 하나가 없어서 목록 200·상세 200·401 텍스트 0 까지 다 안 돌았다).
 * 본문을 실제로 검사하는 것은 픽스처 CMS 를 띄우고 도는 묶음이다
 * (sprint8.spec.ts '비회원 첫 편 본문은 끝까지 열리고 끝에서만 로그인을 권한다').
 * 그러니 여기서는 dev 로 확인 가능한 것을 계속 돌리고, 본문 단언만 값이 있을 때 더한다.
 */
function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requiredNumber(name: string, fallback?: number): number {
  const raw = process.env[name]?.trim() ?? String(fallback ?? '');
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

async function mintMemberToken(
  request: APIRequestContext,
  memberId: number,
): Promise<string> {
  const response = await request.get(
    `${API_BASE_URL}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
  );
  expect(response.status(), `token mint for member ${memberId}`).toBe(200);
  const envelope = (await response.json()) as {
    content?: { accessToken?: string };
  };
  expect(envelope.content?.accessToken).toBeTruthy();
  return String(envelope.content?.accessToken);
}

async function authenticate(
  page: Page,
  request: APIRequestContext,
  memberId: number,
): Promise<string> {
  const token = await mintMemberToken(request, memberId);
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

function absoluteUrl(value: string): string {
  return new URL(value, WEB_BASE_URL).toString();
}

async function expectDomUrl(page: Page, expectedUrl: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.locator('img, video, source, a').evaluateAll(
          (elements, needle) =>
            elements.some((element) => {
              const candidate =
                element.getAttribute('src') ??
                element.getAttribute('href') ??
                element.getAttribute('poster') ??
                '';
              return candidate.includes(String(needle));
            }),
          expectedUrl,
        ),
      { message: `DOM does not contain asset ${expectedUrl}` },
    )
    .toBe(true);
}

test.describe('SPRINT8 P0 regression', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-S8-REG-001 서버 토큰 경유 인사이트 목록·상세 200, 공개 첫 편 전문, 401 텍스트 0', async ({
    page,
  }) => {
    const slug = requiredEnv('E2E_SPRINT8_FIRST_SLUG');
    const title = requiredEnv('E2E_SPRINT8_FIRST_TITLE');
    const bodyFragment = optionalEnv('E2E_SPRINT8_FIRST_BODY_FRAGMENT');

    const list = await page.goto('/insights');
    expect(list?.status(), 'insight list status').toBe(200);
    await expect(page.getByTestId('insight-worldmap')).toBeVisible();

    const detail = await page.goto(`/insights/${slug}`);
    expect(detail?.status(), 'insight detail status').toBe(200);
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    if (bodyFragment) {
      await expect(
        page.getByText(bodyFragment, { exact: false }),
      ).toBeVisible();
    }
    await expect(page.getByText(/401|Unauthorized/i)).toHaveCount(0);
  });

  // TC-S8-REG-002(커버·본문 이미지·비디오·아바타·첨부 5종)는 픽스처 CMS 묶음으로
  // 옮겼다. 여기서는 dev 실데이터에서 5종 경로를 받아 검사하게 돼 있었는데, dev CMS 가
  // 운영과 같은 인스턴스라 검사용 글을 발행할 수 없어 그 값을 채우지 못했고 계속
  // 미실시로 남았다(2026-08-26 확인). 새 자리는
  // sprint8.spec.ts '공개 미디어 5종은 화면에 붙고 인증 없이 200으로 열린다' 다.

  test('TC-S8-REG-003 공개 상세 og:image 존재 및 무인증 200 image/*', async ({
    page,
    request,
  }) => {
    const slug = requiredEnv('E2E_SPRINT8_OG_SLUG');
    const response = await page.goto(`/insights/${slug}`);
    expect(response?.status(), 'OG detail status').toBe(200);
    const imageUrl = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(imageUrl, 'og:image content').toBeTruthy();

    const image = await request.get(absoluteUrl(String(imageUrl)));
    expect(
      image.status(),
      `og:image unauthenticated status: ${String(imageUrl)}`,
    ).toBe(200);
    expect(image.headers()['content-type']).toMatch(/^image\//);
  });

  test('TC-S8-REG-004 sitemap.xml 200 및 공개 인사이트 slug 포함', async ({
    request,
  }) => {
    const slug = requiredEnv('E2E_SPRINT8_FIRST_SLUG');
    const response = await request.get(`${WEB_BASE_URL}/sitemap.xml`);
    expect(response.status()).toBe(200);

    // /sitemap.xml 은 글 주소를 직접 담지 않는다. 종류별로 쪼갠 목차이고
    // 실제 주소는 각 샤드 안에 있다. 예전 테스트는 목차 본문에서 slug 를 찾아
    // 늘 실패했다(2026-08-21 실측: 목차엔 0건, article 샤드엔 존재).
    // 목차를 읽고 샤드를 따라가 확인한다.
    const indexXml = await response.text();
    const shardPaths = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => new URL(match[1]).pathname)
      .filter((pathname) => pathname.startsWith('/sitemaps/'));
    expect(shardPaths.length, 'sitemap index must list shards').toBeGreaterThan(
      0,
    );

    let found = false;
    for (const shardPath of shardPaths) {
      const shard = await request.get(`${WEB_BASE_URL}${shardPath}`);
      expect(shard.status(), `shard ${shardPath} status`).toBe(200);
      if ((await shard.text()).includes(`/insights/${slug}`)) {
        found = true;
        break;
      }
    }
    expect(found, `공개 인사이트 ${slug} 가 어느 샤드에도 없다`).toBe(true);
  });

  test('TC-S8-REG-005 @auth 커뮤니티 Q&A 이미지 DOM 표시 및 원본 무인증 200', async ({
    page,
    request,
  }) => {
    const fixture = {
      pagePath:
        process.env.E2E_SPRINT8_QNA_PAGE_PATH?.trim() ??
        '/community/questions/981417',
      image:
        process.env.E2E_SPRINT8_QNA_IMAGE_PATH?.trim() ??
        '/images/og-image.png',
    };
    const memberId = requiredNumber('E2E_SPRINT8_QNA_MEMBER_ID', 981417);
    const questionId = Number(
      fixture.pagePath.match(/\/questions\/(\d+)/)?.[1],
    );
    expect(questionId, 'Q&A fixture question id').toBeGreaterThan(0);
    const token = await authenticate(page, request, memberId);
    const detailResponse = await request.get(
      `${API_BASE_URL}/api/v1/community/questions/${questionId}?answerPage=1&answerSize=20&questionCommentPage=1&questionCommentSize=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const detailBody = await detailResponse.text();
    test.skip(
      detailResponse.status() === 400 && detailBody.includes('fileUri'),
      qnaFixtureUnreadable(questionId),
    );
    expect(
      detailResponse.status(),
      `Q&A fixture detail API: questionId=${String(questionId)}, body=${detailBody.slice(0, 500)}`,
    ).toBe(200);
    expect(detailBody, 'Q&A fixture image contract').toContain(fixture.image);
    await page.goto(fixture.pagePath);
    await expectDomUrl(page, fixture.image);

    const image = await request.get(absoluteUrl(fixture.image));
    expect(image.status(), 'Q&A original image unauthenticated status').toBe(
      200,
    );
  });

  test('TC-S8-REG-006 home public-feed·jobs·hall-of-fame·map·koans 공개 endpoint 익명 200', async ({
    request,
  }) => {
    const paths = [
      '/api/v1/home/public-feed',
      '/api/v1/jobs',
      '/api/v1/hall-of-fame',
      '/api/v1/insight/map',
      '/api/v1/koans?page=1&size=1',
    ];
    for (const path of paths) {
      const response = await request.get(`${API_BASE_URL}${path}`);
      expect(response.status(), `anonymous GET ${path}`).toBe(200);
    }
  });

  test('TC-S8-REG-007 @auth 유효 세션 로그인 유지 및 익명 공개 경로 redirect 0', async ({
    page,
    request,
  }) => {
    const memberId = requiredNumber('E2E_SPRINT8_AUTH_MEMBER_ID', 981101);
    await authenticate(page, request, memberId);
    await page.goto('/insights');
    await expect(page).not.toHaveURL(/\/login(?:[?#]|$)/);
    const authenticatedCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === 'accessToken',
    );
    expect(authenticatedCookie?.value).toBeTruthy();

    await page.context().clearCookies();
    for (const path of ['/insights', '/insights/koans']) {
      const response = await page.goto(path);
      expect(response?.status(), `anonymous ${path}`).toBe(200);
      await expect(page).not.toHaveURL(/\/login(?:[?#]|$)/);
      await expect(page.getByText(/401|Unauthorized/i)).toHaveCount(0);
    }
  });
});
