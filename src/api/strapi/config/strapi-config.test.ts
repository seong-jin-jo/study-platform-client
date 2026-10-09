import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('Strapi server configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('STRAPI_URL', '');
    vi.stubEnv('STRAPI_API_TOKEN', '');
  });

  it('환경변수 없이 모듈을 불러올 수 있고 실제 접근 시점에 오류를 낸다', async () => {
    const config = await import('./strapi-config');

    expect(() => config.getStrapiBaseUrl()).toThrow(
      'STRAPI_URL is required for the server-only Strapi client.',
    );
    expect(() => config.getStrapiApiToken()).toThrow(
      'STRAPI_API_TOKEN is required for the server-only Strapi client.',
    );
  });

  it('환경변수 없이 sitemap의 인사이트 import chain을 불러올 수 있다', async () => {
    await expect(import('@/api/product/article-access')).resolves.toBeDefined();
  });

  it('호출 시점의 환경변수를 읽고 URL 끝 슬래시를 제거한다', async () => {
    const config = await import('./strapi-config');
    vi.stubEnv('STRAPI_URL', 'https://blog.zeroone.test/');
    vi.stubEnv('STRAPI_API_TOKEN', 'test-token');

    expect(config.getStrapiBaseUrl()).toBe('https://blog.zeroone.test');
    expect(config.getStrapiApiToken()).toBe('test-token');
  });
});
