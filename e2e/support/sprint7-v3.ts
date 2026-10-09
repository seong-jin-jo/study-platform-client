// e2e/package.json의 ESM 경계에서 스펙과 공용 support를 함께 로드한다.
import { type APIRequestContext, expect, type Page } from '@playwright/test';

export const WEB_BASE_URL =
  process.env.E2E_BASE_URL ?? 'https://test.zeroone.it.kr';
export const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://test-api.zeroone.it.kr';

interface ApiEnvelope<T> {
  content: T;
  message?: string;
  statusCode?: number;
}

/**
 * 이 스위트는 dev 에 시드된 테스트 픽스처(특정 조건을 만족하는 회원·방·
 * 프로필 레코드)의 식별자를 전제한다. 값이 없으면 requiredEnv 가 던지는데,
 * CI 에는 그 값이 없어서 매 실행 57건이 같은 예외로 죽었다(2026-08-21 실측).
 * 예외 메시지가 테스트 실패로 섞여 "무엇이 깨졌나"가 안 보였다.
 *
 * 값이 없다는 건 제품이 깨졌다는 뜻이 아니라 **돌릴 환경이 안 갖춰졌다**는 뜻이다.
 * 그래서 어떤 변수가 비었는지 이름을 밝히며 건너뛴다. 결함을 숨기는 게 아니라
 * 미구성을 드러내는 것이다. GitHub Actions 리포지토리 변수로 값을 채우면
 * 그대로 실행된다.
 */
export const SPRINT7_REQUIRED_ENV = [
  'E2E_SPRINT7_MEMBER_ID',
  'E2E_SPRINT7_OWNER_MEMBER_ID',
  'E2E_SPRINT7_OWNER_ROOM_ID',
  'E2E_SPRINT7_EMPTY_MEMBER_ID',
  'E2E_SPRINT7_THREE_ROOM_MEMBER_ID',
  'E2E_SPRINT7_VACANT_ROOM_ID',
  'E2E_SPRINT7_GATED_POST_ID',
  'E2E_SPRINT7_PUBLIC_PROFILE_UUID',
  'E2E_SPRINT7_EMPTY_PROFILE_UUID',
  'E2E_SPRINT7_RACE_MEMBER_IDS',
] as const;

export function missingSprint7Env(): string[] {
  return SPRINT7_REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
}

export function sprint7EnvMissingReason(): string {
  const missing = missingSprint7Env();
  return (
    'Sprint 7 V3 실환경 스위트를 건너뛴다. 비어 있는 환경변수: ' +
    `${missing.join(', ')}. 이 변수들은 dev 에 시드된 테스트 픽스처의 ID 다. ` +
    'GitHub Actions 리포지토리 변수로 등록하면 그대로 실행된다.'
  );
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required for the Sprint 7 V3 real-environment suite`,
    );
  }
  return value;
}

export function requiredMemberId(name = 'E2E_SPRINT7_MEMBER_ID'): number {
  const value = Number(requiredEnv(name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export async function mintMemberToken(
  request: APIRequestContext,
  memberId = requiredMemberId(),
): Promise<string> {
  const configured = process.env.E2E_SPRINT7_MEMBER_TOKEN?.trim();
  if (configured && memberId === requiredMemberId()) return configured;

  const response = await request.get(
    `${API_BASE_URL}/api/v1/tokens/token?member-id=${memberId}&role-id=ROLE_MEMBER`,
  );
  expect(response.status(), `QA token mint failed for member ${memberId}`).toBe(
    200,
  );
  const body = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
  expect(body.content.accessToken).toBeTruthy();
  return body.content.accessToken;
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function authenticatePage(
  page: Page,
  request: APIRequestContext,
  memberId = requiredMemberId(),
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

export async function apiJson<T>(
  request: APIRequestContext,
  path: string,
  options: { token?: string; expectedStatus?: number } = {},
): Promise<T> {
  const response = await request.get(`${API_BASE_URL}${path}`, {
    headers: options.token ? bearer(options.token) : undefined,
  });
  expect(response.status(), `GET ${path}`).toBe(options.expectedStatus ?? 200);
  const body = (await response.json()) as ApiEnvelope<T>;
  return body.content;
}

export function flattenKeys(value: unknown, keys: string[] = []): string[] {
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

export function expectNoSensitiveProfileKeys(value: unknown): void {
  const forbidden = [
    'memberid',
    'email',
    'tel',
    'phone',
    'payment',
    'rep',
    'score',
    'grade',
    'cohort',
  ];
  const keys = flattenKeys(value);
  for (const key of forbidden) {
    expect(
      keys.some((candidate) => candidate.includes(key)),
      `public profile leaked key containing ${key}`,
    ).toBe(false);
  }
}

export function expectSafeSameOriginPath(path: string): void {
  expect(path).toMatch(/^\/(?!\/)/);
  expect(path).not.toMatch(/javascript:|https?:|\.\./i);
}

export function parseMemberIds(name: string): number[] {
  const ids = requiredEnv(name)
    .split(',')
    .map((value) => Number(value.trim()));
  if (
    ids.length < 2 ||
    ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
  ) {
    throw new Error(`${name} must contain at least two positive integer IDs`);
  }
  return [...new Set(ids)];
}
