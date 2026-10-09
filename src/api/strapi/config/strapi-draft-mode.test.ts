import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveStrapiDraftMode } from './strapi-draft-mode';

vi.mock('server-only', () => ({}));

describe('resolveStrapiDraftMode', () => {
  it('is disabled by default', () => {
    expect(resolveStrapiDraftMode({})).toBe(false);
  });

  it('allows draft reads only for the development deploy target', () => {
    expect(
      resolveStrapiDraftMode({
        STRAPI_DRAFT_MODE: 'true',
        ZEROONE_DEPLOY_TARGET: 'development',
      }),
    ).toBe(true);
  });

  it.each([
    undefined,
    'production',
    'staging',
  ])('rejects draft reads for non-development target %s', (deployTarget) => {
    expect(() =>
      resolveStrapiDraftMode({
        STRAPI_DRAFT_MODE: 'true',
        ZEROONE_DEPLOY_TARGET: deployTarget,
      }),
    ).toThrow(
      'STRAPI_DRAFT_MODE=true is allowed only when ZEROONE_DEPLOY_TARGET=development.',
    );
  });

  it('rejects ambiguous flag values', () => {
    expect(() =>
      resolveStrapiDraftMode({
        STRAPI_DRAFT_MODE: '1',
        ZEROONE_DEPLOY_TARGET: 'development',
      }),
    ).toThrow('STRAPI_DRAFT_MODE must be either "true" or "false".');
  });
});

describe('strapiFetch draft query', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('STRAPI_URL', 'https://blog.zeroone.test');
    vi.stubEnv('STRAPI_API_TOKEN', 'test-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not request drafts when the flag is absent', async () => {
    const { strapiFetch } = await import('../api/common-strapi-fetch');

    await strapiFetch('/api/articles?filters[slug][$eq]=event-loop');

    const requestUrl = new URL(vi.mocked(fetch).mock.calls[0]?.[0] as string);
    expect(requestUrl.searchParams.has('status')).toBe(false);
  });

  it('adds status=draft without dropping existing query parameters in dev', async () => {
    vi.stubEnv('STRAPI_DRAFT_MODE', 'true');
    vi.stubEnv('ZEROONE_DEPLOY_TARGET', 'development');
    const { strapiFetch } = await import('../api/common-strapi-fetch');

    await strapiFetch('/api/articles?filters[slug][$eq]=event-loop');

    const requestUrl = new URL(vi.mocked(fetch).mock.calls[0]?.[0] as string);
    expect(requestUrl.searchParams.get('status')).toBe('draft');
    expect(requestUrl.searchParams.get('filters[slug][$eq]')).toBe(
      'event-loop',
    );
  });

  // 2026-08-21 dev 사고 회귀. 인사이트 본문은 strapiFetchNoStore 로 가져오는데
  // 그 함수만 draft 분기를 빠뜨려 dev 가 본문을 늘 published 로 조회했다.
  // 시드가 넣은 39편 중 36편이 draft 라 전부 "찾을 수 없음" 이 됐고 화면에는
  // "내용이 없습니다" 만 남았다. 두 함수가 같은 규칙을 따르는지 여기서 잠근다.
  it('adds status=draft for the no-store fetcher too', async () => {
    vi.stubEnv('STRAPI_DRAFT_MODE', 'true');
    vi.stubEnv('ZEROONE_DEPLOY_TARGET', 'development');
    const { strapiFetchNoStore } = await import('../api/common-strapi-fetch');

    await strapiFetchNoStore('/api/articles?filters[documentId][$eq]=abc123');

    const requestUrl = new URL(vi.mocked(fetch).mock.calls[0]?.[0] as string);
    expect(requestUrl.searchParams.get('status')).toBe('draft');
    expect(requestUrl.searchParams.get('filters[documentId][$eq]')).toBe(
      'abc123',
    );
  });

  it('keeps the no-store fetcher on published outside development', async () => {
    const { strapiFetchNoStore } = await import('../api/common-strapi-fetch');

    await strapiFetchNoStore('/api/articles?filters[documentId][$eq]=abc123');

    const requestUrl = new URL(vi.mocked(fetch).mock.calls[0]?.[0] as string);
    expect(requestUrl.searchParams.has('status')).toBe(false);
  });
});
