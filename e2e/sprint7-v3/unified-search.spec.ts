/** 담당 테스트 케이스: S7-SEARCH-N01, S7-SEARCH-E01, S7-SEARCH-Z01, S7-SEARCH-A01 */
import { expect, test } from '@playwright/test';

import {
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

function flattenKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      flattenKeys(item, keys);
    });
    return keys;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      keys.push(key.toLowerCase());
      flattenKeys(child, keys);
    });
  }
  return keys;
}

interface SearchItem {
  type: 'COMMUNITY_POST' | 'INSIGHT_ARTICLE';
  resourceKey: string;
  previewText: string;
  destination: string;
}

interface SearchPage {
  items: SearchItem[];
  nextCursor?: string;
  partial: boolean;
  unavailableSources: string[];
}

const query = process.env.E2E_SPRINT7_SEARCH_QUERY?.trim() || '배포';

test.describe('Sprint 7 V3 unified search @responsive', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('guest receives mixed community and insight results with stable cursor keys', async ({
    page,
  }) => {
    const searchResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/v1/search' &&
        response.request().method() === 'GET',
    );
    await page.goto(`/search?q=${encodeURIComponent(query)}`);
    expect((await searchResponse).status()).toBe(200);
    await expect(
      page.getByRole('region', { name: '통합검색 결과' }),
    ).toBeVisible();
    const cards = page.getByTestId('search-result-card');
    await expect(cards.first()).toBeVisible();
    const labels = await cards.locator('span').allTextContents();
    expect(labels).toContain('공부방 글');
    expect(labels).toContain('인사이트');

    const keys = await cards.evaluateAll((nodes) =>
      nodes.map((node) => {
        const link = node.querySelector('a');
        return link?.getAttribute('href') ?? '';
      }),
    );
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('search response does not echo query or identity telemetry fields', async ({
    request,
  }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}&size=10`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    const keys = flattenKeys(body);
    for (const forbidden of [
      'query',
      'normalizedquery',
      'queryhash',
      'memberid',
      'sessionid',
      'ip',
      'useragent',
    ]) {
      expect(keys).not.toContain(forbidden);
    }
    const content = body.content as SearchPage;
    expect(content.items.length).toBeLessThanOrEqual(50);
    expect(content.items.every((item) => item.previewText.length <= 300)).toBe(
      true,
    );
  });

  test('unknown term keeps the search section and offers one recovery action', async ({
    page,
  }) => {
    const emptyQuery = `zz-no-result-${Date.now()}`;
    await page.goto(`/search?q=${encodeURIComponent(emptyQuery)}`);
    await expect(
      page.getByText(`"${emptyQuery}"으로 나온 글이 없어요`),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '사람 많은 방 보기' }),
    ).toHaveAttribute('href', '/community');
  });

  test('guest search stays readable without login and invalid length redirects safely', async ({
    page,
  }) => {
    await page.goto(`/search?q=${encodeURIComponent(query)}`);
    await expect(
      page.getByRole('region', { name: '통합검색 결과' }),
    ).toBeVisible();
    await expect(page.getByText(/^401$/)).toHaveCount(0);

    await page.goto('/search?q=x');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/^401$/)).toHaveCount(0);
  });
});
