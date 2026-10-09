import { expect, test } from '@playwright/test';

/**
 * 레슨 관리 페이지(/admin/courses/[courseId]/lessons)의 "현재 레슨 저장"이
 * 본문을 콘텐츠 레포(content/source)로 라우팅하는지 검증한다(이중 마스터 방지 회귀 가드).
 *
 * ⚠️ CI-safe(서버 무변경): 저장 PUT 요청을 page.route 로 **가로채 mock 200 으로 응답**한다.
 * 따라서 요청은 실제 백엔드/콘텐츠 레포(SSOT)에 닿지 않는다 — 실 레슨 본문을 건드리지 않고
 * "프론트가 어떤 엔드포인트로 저장을 보내는지"(라우팅)만 검증한다. 실레슨에 돌려도 안전.
 *
 * 인증 필요(@auth). 로컬: E2E_ADMIN_TOKEN(test accessToken) 주입.
 *   E2E_ADMIN_TOKEN=<token> E2E_COURSE_ID=1 yarn e2e --grep @auth
 * CI: GitHub-hosted 워크플로(client-e2e-auth.yml)에서 실행(실게이트).
 *
 * 기대: 저장 시 PUT .../admin/lessons/{id}/content/source 가 호출된다(본문→레포).
 * 회귀(이전 버그): 메타 PUT .../admin/lessons/{id} 의 body 에 content 가 실리면 안 된다(본문 DB 직접쓰기).
 */
test.describe('admin 레슨 저장 → content/source 라우팅 @auth', () => {
  const token = process.env.E2E_ADMIN_TOKEN;
  const adminMemberId = process.env.E2E_ADMIN_MEMBER_ID ?? '68';
  const courseId = process.env.E2E_COURSE_ID ?? '3';
  const base = process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
  const apiBase =
    process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

  test('레슨 저장이 본문을 content/source 로 라우팅한다 (서버 무변경)', async ({
    page,
    context,
    request,
  }) => {
    let accessToken = token;
    if (!accessToken) {
      const tokenResponse = await request.get(
        `${apiBase}/api/v1/tokens/token?member-id=${adminMemberId}&role-id=ROLE_ADMIN`,
      );
      expect(tokenResponse.status()).toBe(200);
      const tokenBody = (await tokenResponse.json()) as {
        content?: { accessToken?: string };
      };
      accessToken = tokenBody.content?.accessToken;
    }
    expect(accessToken).toBeTruthy();
    const host = new URL(base).hostname;
    await context.addCookies([
      {
        name: 'accessToken',
        value: String(accessToken),
        domain: host,
        path: '/',
      },
    ]);

    const savePuts: { url: string; body: string | null }[] = [];
    const isSavePut = (method: string, url: string) =>
      method === 'PUT' &&
      /\/admin\/lessons\/\d+(\/content\/source)?(\?.*)?$/.test(url);

    // 저장 PUT 만 가로채 mock 200 응답 → 실제 서버/SSOT 무변경.
    // 그 외(레슨 로드 GET 등)는 그대로 통과시켜 에디터가 정상 동작하게 한다.
    await page.route('**/admin/lessons/**', async (route) => {
      const req = route.request();
      const url = req.url();
      if (!isSavePut(req.method(), url)) {
        await route.continue();
        return;
      }
      savePuts.push({ url, body: req.postData() });
      const isSource = /\/content\/source(\?.*)?$/.test(url);
      const mock = isSource
        ? {
            statusCode: 200,
            message: null,
            content: {
              committed: true,
              contentSha: 'e2e-mock-sha',
              path: 'e2e/mock.md',
            },
          }
        : { statusCode: 200, message: null, content: { lessonId: 0 } };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mock),
      });
    });

    await page.goto(`${base}/admin/courses/${courseId}/lessons`, {
      waitUntil: 'networkidle',
    });

    // 첫 레슨 "수정" 진입 → 편집 폼 오픈
    await page.getByRole('button', { name: '수정' }).first().click();

    const saveButton = page.getByRole('button', { name: '현재 레슨 저장' });
    await saveButton.waitFor({ state: 'visible', timeout: 20000 });

    // 저장이 PUT 을 쏘도록 변경 유발(가로채므로 서버엔 안 감 → 무해).
    const editable = page
      .locator(
        '[contenteditable="true"], textarea[placeholder*="레슨 본문"], .ProseMirror',
      )
      .first();
    try {
      await editable.waitFor({ state: 'visible', timeout: 8000 });
      await editable.click();
      await page.keyboard.type(' E2E-ROUTE-CHECK');
    } catch {
      console.info('본문 에디터 입력 스킵(셀렉터 미스) — 저장 라우팅만 검증');
    }

    await saveButton.click();

    // content/source PUT 캡처 대기(mock 이라 빠름). 이어서 메타 PUT(onSuccess 체인) 여유.
    await expect
      .poll(() => savePuts.some((p) => p.url.includes('/content/source')), {
        timeout: 15000,
      })
      .toBe(true);
    await page.waitForTimeout(2000);

    const contentSource = savePuts.filter((p) =>
      p.url.includes('/content/source'),
    );
    // 메타 PUT(/admin/lessons/{id}) 자체는 정상 — 단 body 에 content 가 실리면 안 됨(이중 마스터).
    const metaWithBody = savePuts
      .filter((p) => !p.url.includes('/content/source'))
      .filter((p) => {
        if (!p.body) return false;
        try {
          const j = JSON.parse(p.body);
          return j.content !== undefined && j.content !== null;
        } catch {
          return /"content"\s*:/.test(p.body);
        }
      });

    console.info(
      '가로챈 저장 PUT:',
      savePuts.map((p) => p.url),
    );

    expect(
      contentSource.length,
      `본문 저장은 content/source 로 가야 함. 실제: ${JSON.stringify(savePuts.map((p) => p.url))}`,
    ).toBeGreaterThan(0);
    expect(
      metaWithBody.length,
      `본문(content)이 메타 PUT 에 실리면 안 됨(이중 마스터). 위반: ${JSON.stringify(metaWithBody)}`,
    ).toBe(0);
  });
});
