/** 담당 테스트 케이스: S7-SEO-N01, S7-SEO-E01, S7-SEO-Z01, S7-SEO-A01 */
import { type APIRequestContext, expect, test } from '@playwright/test';

import {
  missingSprint7Env,
  sprint7EnvMissingReason,
} from '../support/sprint7-v3';

test.skip(missingSprint7Env().length > 0, sprint7EnvMissingReason());

const FRONTEND_ORIGIN =
  process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
const API_ORIGIN =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

test.use({ storageState: { cookies: [], origins: [] } });

type JsonRecord = Record<string, unknown>;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required for the Sprint 7 V3 real-environment suite`,
    );
  }
  return value;
}

function unwrapContent(value: unknown): JsonRecord {
  expect(value).toBeTruthy();
  expect(typeof value).toBe('object');
  const content = (value as JsonRecord).content;
  expect(content).toBeTruthy();
  expect(typeof content).toBe('object');
  return content as JsonRecord;
}

function itemsOf(content: JsonRecord): JsonRecord[] {
  const items = content.items;
  expect(Array.isArray(items)).toBe(true);
  return items as JsonRecord[];
}

function recursiveKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(recursiveKeys);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as JsonRecord).flatMap(([key, child]) => [
    key,
    ...recursiveKeys(child),
  ]);
}

function expectNoKeys(value: unknown, forbidden: RegExp): void {
  const offending = recursiveKeys(value).filter((key) => forbidden.test(key));
  expect(offending, `forbidden keys: ${offending.join(', ')}`).toEqual([]);
}

function codePointLength(value: string): number {
  return [...value].length;
}

async function discoverPublicPostId(
  request: APIRequestContext,
): Promise<string> {
  const response = await request.get(
    `${API_ORIGIN}/api/v1/community/sitemap-resources`,
    { params: { types: 'POST', size: 50 } },
  );
  expect(response.status()).toBe(200);
  const items = itemsOf(unwrapContent(await response.json()));
  const post = items.find(
    (item) => item.type === 'POST' || typeof item.postId === 'number',
  );
  expect(post, 'no public community post seed found').toBeTruthy();
  return String(post?.postId ?? post?.id ?? post?.resourceId);
}

test.use({ storageState: { cookies: [], origins: [] } });

const forbiddenPreviewKeys =
  /^(contentRaw|contentHtml|body|blocks|comments|answers|answerBodies|attachmentDownloadUrls)$/i;
const forbiddenLegacySeoKeys = /^(gatedBodyHtml|gatedCssSelector|hasPart)$/i;

test.describe('Sprint 7 V3 검색 노출과 구조화 데이터', () => {
  test('정상: 최초 HTML에 canonical, 공개 요약, JSON-LD가 있고 UA별 내용이 같다', async ({
    request,
  }) => {
    const postId = await discoverPublicPostId(request);
    const seoResponse = await request.get(
      `${API_ORIGIN}/api/v2/community/posts/${postId}/seo-document`,
    );
    expect(seoResponse.status()).toBe(200);
    const seoContent = unwrapContent(await seoResponse.json());
    expect(['FULL', 'TEASER']).toContain(seoContent.accessMode);
    expectNoKeys(seoContent, forbiddenLegacySeoKeys);
    if (seoContent.accessMode === 'TEASER') {
      expect(seoContent.bodyAccess).toBe('ROOM_MEMBER');
      expect(seoContent).not.toHaveProperty('publicBodyHtml');
    } else {
      expect(seoContent.bodyAccess).toBe('PUBLIC');
      expect(typeof seoContent.publicBodyHtml).toBe('string');
    }

    const guest = await request.get(`${FRONTEND_ORIGIN}/community/${postId}`);
    const crawler = await request.get(
      `${FRONTEND_ORIGIN}/community/${postId}`,
      {
        headers: { 'user-agent': 'Googlebot' },
      },
    );
    expect(guest.status()).toBe(200);
    expect(crawler.status()).toBe(200);
    const guestHtml = await guest.text();
    const crawlerHtml = await crawler.text();
    for (const html of [guestHtml, crawlerHtml]) {
      expect(html).toContain(`<link rel="canonical"`);
      expect(html).toContain(`/community/${postId}`);
      expect(html).toContain('application/ld+json');
      expect(html).toContain(String(seoContent.publicSummaryText));
      expect(html).not.toContain('zeroone-gated-body');
      expect(html).not.toContain('gatedBodyHtml');
    }
    expect(crawlerHtml.replace(/nonce="[^"]+"/g, '')).toBe(
      guestHtml.replace(/nonce="[^"]+"/g, ''),
    );
  });

  test('예외: 존재하지 않는 글은 일반 상세와 SEO document 모두 404다', async ({
    request,
  }) => {
    const missingId = '9223372036854775807';
    const detail = await request.get(
      `${API_ORIGIN}/api/v1/community/posts/${missingId}`,
    );
    const seo = await request.get(
      `${API_ORIGIN}/api/v1/community/posts/${missingId}/seo-document`,
    );
    expect(detail.status()).toBe(404);
    expect(seo.status()).toBe(404);
  });

  test('빈 상태: 방장 없거나 빈 방은 sitemap에서 제외한다', async ({
    request,
  }) => {
    const roomId = requireEnv('E2E_SPRINT7_VACANT_ROOM_ID');
    const response = await request.get(
      `${API_ORIGIN}/api/v1/community/sitemap-resources`,
      { params: { types: 'ROOM', size: 1000 } },
    );
    expect(response.status()).toBe(200);
    const roomIds = itemsOf(unwrapContent(await response.json())).map((item) =>
      String(item.roomId ?? item.resourceId),
    );
    expect(roomIds).not.toContain(roomId);
  });

  test('권한 없음: 미입장 일반 API는 PREVIEW이고 v2 SEO는 safe TEASER다', async ({
    request,
  }) => {
    const postId = requireEnv('E2E_SPRINT7_GATED_POST_ID');
    const response = await request.get(
      `${API_ORIGIN}/api/v1/community/posts/${postId}`,
    );
    expect(response.status()).toBe(200);
    const content = unwrapContent(await response.json());
    expect(['PREVIEW', 'TEASER']).toContain(content.access);
    expect(codePointLength(String(content.previewText))).toBeLessThanOrEqual(
      300,
    );
    expectNoKeys(content, forbiddenPreviewKeys);

    const legacySeo = await request.get(
      `${API_ORIGIN}/api/v1/community/posts/${postId}/seo-document`,
    );
    expect(legacySeo.status()).toBe(403);

    const safeSeo = await request.get(
      `${API_ORIGIN}/api/v2/community/posts/${postId}/seo-document`,
    );
    expect(safeSeo.status()).toBe(200);
    const safeSeoContent = unwrapContent(await safeSeo.json());
    expect(safeSeoContent.accessMode).toBe('TEASER');
    expect(safeSeoContent.bodyAccess).toBe('ROOM_MEMBER');
    expectNoKeys(safeSeoContent, forbiddenLegacySeoKeys);
    expect(safeSeoContent).not.toHaveProperty('publicBodyHtml');
  });
});
