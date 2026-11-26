import { expect, test, type Request } from '@playwright/test';

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const appOrigin = new URL(process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100')
  .origin;

const getCollectParameter = (request: Request, name: string) => {
  const url = new URL(request.url());
  const body = new URLSearchParams(request.postData() ?? '');
  return body.get(name) ?? url.searchParams.get(name);
};

const createMemberToken = () => {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);

  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({
      authVendor: 'TEST',
      exp: now + 3600,
      iat: now,
      memberId: 900001,
      roleIds: ['ROLE_MEMBER'],
      sub: 'ga4-local-e2e',
    }),
    'local-e2e',
  ].join('.');
};

test('로컬 가입 완료가 GA4 collect 요청으로 이어진다', async ({
  context,
  page,
}) => {
  test.skip(!measurementId, 'NEXT_PUBLIC_GA_MEASUREMENT_ID가 필요하다');

  await context.addCookies([
    {
      name: 'accessToken',
      value: createMemberToken(),
      url: appOrigin,
    },
    { name: 'memberId', value: '900001', url: appOrigin },
  ]);
  await page.route('http://127.0.0.1:3101/**', async (route) => {
    const corsHeaders = {
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-origin': appOrigin,
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const requestUrl = route.request().url();
    const content = requestUrl.endsWith('/api/v6/class-onboarding/me')
      ? { completedAt: '2026-11-26T00:00:00Z', lastSavedStep: 'COMPLETED' }
      : requestUrl.endsWith('/api/v1/members/900001/profile')
        ? {
            memberId: 900001,
            memberProfile: {
              memberName: 'GA4 로컬 검증',
              nickname: 'ga4-local-e2e',
              profileImage: { resizedImages: [] },
              tel: null,
            },
          }
        : {};
    await route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({ content }),
    });
  });
  await page.route('**/api/v6/class-onboarding/me/step-4', async (route) => {
    const corsHeaders = {
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-origin': appOrigin,
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({
        content: {
          emailSyncQueued: false,
          onboardingStep: 'COMPLETED',
          seminarAssigned: false,
        },
      }),
    });
  });

  const collectRequest = page.waitForRequest(
    (request) => {
      const url = new URL(request.url());
      return (
        url.hostname.endsWith('google-analytics.com') &&
        url.pathname.endsWith('/g/collect') &&
        getCollectParameter(request, 'en') === 'signup_complete'
      );
    },
    { timeout: 20_000 },
  );
  await page.route(
    /https:\/\/[^/]*google-analytics\.com\/g\/collect.*/,
    async (route) => {
      await route.fulfill({ status: 204, body: '' });
    },
  );

  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(`${message.location().url}: ${message.text()}`);
    }
  });

  await page.goto('/onboarding/retention?cohort=ga4-local-e2e', {
    waitUntil: 'networkidle',
  });
  await page.getByRole('button', { name: '웹앱 수익화' }).click();
  await page.getByLabel('안내받을 이메일').fill('ga4-local-e2e@zeroone.it.kr');
  await page.getByRole('button', { name: '목표 방으로 들어가기' }).click();

  const request = await collectRequest;
  expect(getCollectParameter(request, 'en')).toBe('signup_complete');
  expect(getCollectParameter(request, 'tid')).toBe(measurementId);
  expect(consoleErrors).toEqual([]);
});
