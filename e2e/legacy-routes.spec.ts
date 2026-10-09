import { expect, test } from '@playwright/test';

// No auth needed — middleware blocks before any auth check
test.use({ storageState: { cookies: [], origins: [] } });

const BLOCKED = [
  '/group-study',
  '/group-study/123',
  '/premium-study',
  '/premium-study/456',
  '/mentoring',
  '/mentoring/789',
  '/mentoring/789/apply',
  '/mentoring/become-mentor',
  '/mentoring/scroll-card-playground',
  '/mentoring/temp',
  '/one-on-one',
  '/developer-registration',
  '/application-list/111',
  '/inquiry',
  '/payment-management',
  '/test-sentry',
  '/test-sentry-server-error',
  '/community/questions/error-preview',
  '/admin/clipboard-inspector',
];

const ACTIVE = ['/class', '/home', '/community', '/insights', '/my-inquiry'];

test.describe('레거시 라우트 차단', () => {
  for (const route of BLOCKED) {
    test(`${route} → 404`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(404);
    });
  }
});

test.describe('현행 라우트 회귀', () => {
  for (const route of ACTIVE) {
    test(`${route} → 404 아님`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).not.toBe(404);
    });
  }
});
