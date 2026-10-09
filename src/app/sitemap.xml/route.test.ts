import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  collectSitemapResources: vi.fn(),
  buildPartitions: vi.fn(),
  buildSitemapIndexXml: vi.fn(),
}));

vi.mock('@/api/endpoints/seo/sitemap.server', () => mocks);

import { GET } from './route';

describe('sitemap.xml atomic route', () => {
  beforeEach(() => {
    mocks.collectSitemapResources.mockResolvedValue([]);
    mocks.buildPartitions.mockReturnValue([]);
    mocks.buildSitemapIndexXml.mockReturnValue(
      '<?xml version="1.0"?><sitemapindex/>',
    );
  });

  it('returns the buffered index without shared caching', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('<sitemapindex');
  });

  it('fails closed with 503 when any dependency fails', async () => {
    mocks.collectSitemapResources.mockRejectedValue(
      new Error('upstream timeout'),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(await response.text()).not.toContain('<sitemapindex');
  });
});
