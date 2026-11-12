import { expect, test } from '@playwright/test';

// 개인정보처리방침 공개 페이지 /privacy. 승인본은 src/content/privacy/privacy-policy-v1.0.md.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('개인정보처리방침 /privacy', () => {
  test.beforeEach(async ({ page }) => {
    // 새로운 기능 카드가 푸터를 가리지 않게 이미 본 것으로 둔다.
    await page.addInitScript(() =>
      window.localStorage.setItem('zo_last_seen_version', '0.10.12'),
    );
  });

  test('비로그인으로 200, 개정 공지·현행 안내·전문·이력이 보이고 가로로 넘치지 않는다', async ({
    page,
  }) => {
    const response = await page.goto('/privacy');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/개인정보처리방침/);

    const notice = page.getByTestId('privacy-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('시행일 2026-12-13');
    await expect(page.getByTestId('privacy-current')).toContainText(
      '2026-12-12 까지는 현행 방침(v0.3)이 적용됩니다',
    );
    await expect(
      page.getByRole('link', { name: /현행 방침 v0\.3 보기/ }),
    ).toHaveAttribute(
      'href',
      /gaan\.notion\.site\/389fbb391d798087a519cda1255fdfc1/,
    );
    await expect(page.getByTestId('privacy-body')).toContainText(
      '개인정보 처리 위탁',
    );
    await expect(page.getByTestId('privacy-history')).toContainText(
      '시행 2026-12-13 (공지 2026-11-13)',
    );

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('푸터의 개인정보처리방침 링크가 같은 사이트의 /privacy 로 이동한다', async ({
    page,
  }) => {
    await page.goto('/about');
    const link = page
      .getByRole('contentinfo')
      .getByRole('link', { name: '개인정보처리방침' });
    await expect(link).toHaveAttribute('href', '/privacy');
    await link.click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByTestId('privacy-notice')).toBeVisible();
  });

  test('계정 삭제 안내의 처리방침 링크도 /privacy 로 연결된다', async ({
    context,
    page,
  }) => {
    await page.goto('/account/delete');
    const link = page.getByRole('link', { name: '개인정보처리방침 원문 보기' });
    await expect(link).toHaveAttribute('href', '/privacy');
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      link.click(),
    ]);
    await expect(popup).toHaveURL(/\/privacy$/);
    await expect(popup.getByTestId('privacy-current')).toContainText(
      '현행 방침(v0.3)',
    );
  });
});
