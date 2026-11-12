import { expect, type Page, test } from '@playwright/test';

// "새로운 기능" 카드와 공개 업데이트 소식(/updates) 검증.
// 정본: ~/.claude/standards/release-notes-and-whats-new.md
// 외부로 나가는 GA4 요청은 route 로 가로채 abort 한다(운영 통계 오염 방지).
// 아래 기대값은 src/content/release-notes.json 의 최신 항목(0.10.12, notify:true)에 맞춘다.
const LATEST_VERSION = '0.10.12';
const STORAGE_KEY = 'zo_last_seen_version';
const CARD_ROUTE = '/about';

// 인증이 필요 없는 공개 화면만 쓴다.
test.use({ storageState: { cookies: [], origins: [] } });

interface Ga4Hit {
  event: string;
  params: string;
}

async function blockAndRecordGa4(page: Page) {
  const hits: Ga4Hit[] = [];
  await page.route(/google-analytics\.com\/g\/collect/, async (route) => {
    const url = new URL(route.request().url());
    const event = url.searchParams.get('en') ?? '';
    if (event.startsWith('whats_new_')) {
      hits.push({ event, params: url.search });
    }
    await route.abort();
  });
  await page.route(/googletagmanager\.com/, (route) => route.abort());
  return hits;
}

async function dataLayerEvents(page: Page) {
  return page.evaluate(() =>
    (
      (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ??
      []
    )
      .map((entry) => Array.from(entry))
      .filter(
        (entry) =>
          entry[0] === 'event' && String(entry[1]).startsWith('whats_new_'),
      ),
  );
}

test.describe('공개 업데이트 소식 /updates', () => {
  test('비로그인으로 200, 최신부터 3개 항목과 머리줄 형식', async ({
    page,
  }) => {
    const response = await page.goto('/updates');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/업데이트 소식/);

    const items = page.getByTestId('updates-item');
    await expect(items).toHaveCount(3);
    await expect(items.first().getByRole('heading')).toHaveText(
      new RegExp(`^${LATEST_VERSION} · \\d{4}-\\d{2}-\\d{2} · .+`),
    );
    await expect(
      page.getByRole('link', { name: '업데이트 소식' }),
    ).toBeVisible();
  });
});

test.describe('새로운 기능 카드', () => {
  test('첫 방문 노출 → 닫기 → 새로고침 후 미노출, 이벤트 인자', async ({
    page,
  }) => {
    const hits = await blockAndRecordGa4(page);
    await page.goto(CARD_ROUTE);

    const card = page.getByTestId('whats-new-card');
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading')).toHaveText(/.+/);
    await expect(card.getByText('써 보기')).toBeVisible();
    await expect(card.getByText('의견 남기기')).toBeVisible();

    const viewEvents = await dataLayerEvents(page);
    expect(viewEvents).toContainEqual([
      'event',
      'whats_new_view',
      expect.objectContaining({ version: LATEST_VERSION }),
    ]);

    await page.getByTestId('whats-new-close').click();
    await expect(card).toBeHidden();
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        STORAGE_KEY,
      ),
    ).toBe(LATEST_VERSION);

    await page.reload();
    await page.waitForTimeout(2500); // 노출 지연(1.2초)보다 길게 기다린다.
    await expect(page.getByTestId('whats-new-card')).toHaveCount(0);
    // 같은 버전에서는 이벤트도 다시 가지 않는다.
    expect(
      (await dataLayerEvents(page)).filter((e) => e[1] === 'whats_new_view'),
    ).toHaveLength(0);
    void hits;
  });

  test('노출만 되고 아무것도 안 눌러도 재방문에는 뜨지 않는다(한 번만 알림)', async ({
    page,
  }) => {
    await blockAndRecordGa4(page);
    await page.goto(CARD_ROUTE);
    await expect(page.getByTestId('whats-new-card')).toBeVisible();
    // 닫기·버튼을 누르지 않고 저장 여부만 본다.
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        STORAGE_KEY,
      ),
    ).toBe(LATEST_VERSION);

    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.getByTestId('whats-new-card')).toHaveCount(0);
  });

  test('저장된 버전이 최신과 같으면 처음부터 뜨지 않는다', async ({ page }) => {
    await blockAndRecordGa4(page);
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [STORAGE_KEY, LATEST_VERSION],
    );
    await page.goto(CARD_ROUTE);
    await page.waitForTimeout(2500);
    await expect(page.getByTestId('whats-new-card')).toHaveCount(0);
  });

  test('로그인 화면에서는 뜨지 않는다', async ({ page }) => {
    await blockAndRecordGa4(page);
    await page.goto('/login');
    await page.waitForTimeout(2500);
    await expect(page.getByTestId('whats-new-card')).toHaveCount(0);
  });

  test('써 보기는 try_href 로 이동하고 version·href 를 담아 이벤트를 보낸다', async ({
    page,
  }) => {
    await blockAndRecordGa4(page);
    await page.goto(CARD_ROUTE);
    await expect(page.getByTestId('whats-new-card')).toBeVisible();

    await page.getByTestId('whats-new-try').click();
    await expect(page).toHaveURL(/\/updates$/);

    const events = await dataLayerEvents(page);
    expect(events).toContainEqual([
      'event',
      'whats_new_try',
      expect.objectContaining({ version: LATEST_VERSION, href: '/updates' }),
    ]);
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        STORAGE_KEY,
      ),
    ).toBe(LATEST_VERSION);
  });

  test('비회원 의견 남기기는 로그인 모달을 열고, 로그인 뒤 문의 화면(버전 쿼리)으로 돌아오게 저장한다', async ({
    page,
  }) => {
    await blockAndRecordGa4(page);
    // 소셜 로그인 이동은 외부로 보내지 않고 막는다. 저장되는 복귀 경로만 콘솔로 관찰한다.
    await page.route(/\/api\/v1\/auth\/kakao\/authorize/, (route) =>
      route.abort(),
    );
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'zero-one:oauth-callback-path') {
          console.log(`OAUTH_CALLBACK=${value}`);
        }
        return original.call(this, key, value);
      };
    });
    const logs: string[] = [];
    page.on('console', (msg) => logs.push(msg.text()));

    await page.goto(CARD_ROUTE);
    await expect(page.getByTestId('whats-new-card')).toBeVisible();

    const button = page.getByTestId('whats-new-feedback');
    await expect(button).toHaveJSProperty('tagName', 'BUTTON'); // 링크가 아니다
    await button.click();

    // 홈으로 튕기지 않고 같은 화면 위에 로그인 모달이 열린다. 카드도 그대로다.
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByTestId('whats-new-card')).toBeVisible();
    expect(await dataLayerEvents(page)).toContainEqual([
      'event',
      'whats_new_feedback',
      expect.objectContaining({
        version: LATEST_VERSION,
        method: 'login_modal',
      }),
    ]);

    await page.getByRole('button', { name: '카카오 계정 로그인' }).click();
    await expect
      .poll(() => logs.find((text) => text.startsWith('OAUTH_CALLBACK=')))
      .toBe(`OAUTH_CALLBACK=/my-inquiry/write?whats_new=${LATEST_VERSION}`);
  });
});
