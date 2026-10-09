// e2e/package.json의 ESM 경계에서 스펙과 공용 helper를 함께 로드한다.
import {
  type APIRequestContext,
  type BrowserContext,
  expect,
} from '@playwright/test';

export const FRONTEND_ORIGIN =
  process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
export const API_ORIGIN =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';
export const SEARCH_QUERY = process.env.E2E_SPRINT7_SEARCH_QUERY ?? '배포';

export type JsonRecord = Record<string, unknown>;

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required for the Sprint 7 V3 real-environment suite`,
    );
  }
  return value;
}

export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function injectAuth(
  context: BrowserContext,
  token: string,
): Promise<void> {
  const url = new URL(FRONTEND_ORIGIN);
  await context.addCookies([
    {
      name: 'accessToken',
      value: token,
      domain: url.hostname,
      path: '/',
      secure: url.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);
}

export function unwrapContent(value: unknown): JsonRecord {
  expect(value).toBeTruthy();
  expect(typeof value).toBe('object');
  const envelope = value as JsonRecord;
  const content = envelope.content;
  expect(content).toBeTruthy();
  expect(typeof content).toBe('object');
  return content as JsonRecord;
}

export function itemsOf(content: JsonRecord): JsonRecord[] {
  const items = content.items;
  expect(Array.isArray(items)).toBe(true);
  return items as JsonRecord[];
}

export function recursiveKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(recursiveKeys);
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.entries(value as JsonRecord).flatMap(([key, child]) => [
    key,
    ...recursiveKeys(child),
  ]);
}

export function expectNoKeys(value: unknown, forbidden: RegExp): void {
  const offending = recursiveKeys(value).filter((key) => forbidden.test(key));
  expect(offending, `forbidden keys: ${offending.join(', ')}`).toEqual([]);
}

export function codePointLength(value: string): number {
  return [...value].length;
}

export async function findSearchItems(request: APIRequestContext): Promise<{
  community: JsonRecord;
  insight: JsonRecord;
}> {
  const response = await request.get(`${API_ORIGIN}/api/v1/search`, {
    params: { q: SEARCH_QUERY, size: 50 },
  });
  expect(response.status()).toBe(200);
  const content = unwrapContent(await response.json());
  const items = itemsOf(content);
  const community = items.find((item) => item.type === 'COMMUNITY_POST');
  const insight = items.find((item) => item.type === 'INSIGHT_ARTICLE');
  expect(
    community,
    `community result missing for query: ${SEARCH_QUERY}`,
  ).toBeTruthy();
  expect(
    insight,
    `insight result missing for query: ${SEARCH_QUERY}`,
  ).toBeTruthy();
  return { community: community as JsonRecord, insight: insight as JsonRecord };
}

export async function discoverPublicProfileUuid(
  request: APIRequestContext,
): Promise<string> {
  const response = await request.get(
    `${API_ORIGIN}/api/v1/members/public-profile-sitemap-resources`,
    { params: { size: 50 } },
  );
  expect(response.status()).toBe(200);
  const items = itemsOf(unwrapContent(await response.json()));
  const profile = items.find(
    (item) => typeof item.publicProfileUuid === 'string',
  );
  expect(profile, 'no indexable public profile seed found').toBeTruthy();
  return String(profile?.publicProfileUuid);
}

export async function discoverPublicPostId(
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

export async function getRooms(
  request: APIRequestContext,
  token?: string,
): Promise<JsonRecord[]> {
  const response = await request.get(`${API_ORIGIN}/api/v1/community/rooms`, {
    headers: token ? authHeaders(token) : undefined,
  });
  expect(response.status()).toBe(200);
  const content = unwrapContent(await response.json());
  const myRooms = Array.isArray(content.myRooms) ? content.myRooms : [];
  const exploreRooms = Array.isArray(content.exploreRooms)
    ? content.exploreRooms
    : [];
  return [...myRooms, ...exploreRooms] as JsonRecord[];
}

export function ownershipOf(room: JsonRecord): JsonRecord {
  const ownership = room.ownership;
  expect(ownership).toBeTruthy();
  expect(typeof ownership).toBe('object');
  return ownership as JsonRecord;
}
