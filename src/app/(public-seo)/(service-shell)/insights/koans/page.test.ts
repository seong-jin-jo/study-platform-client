import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/api/endpoints/seo/insight-seo.server', () => ({
  getKoansForSeo: vi.fn(),
}));

import { metadata } from './page';

describe('koan list SEO metadata', () => {
  it('keeps canonical, title, description, and Open Graph aligned', () => {
    expect(metadata.title).toBe('화두 | ZERO ONE IT');
    expect(metadata.description).toBe(
      '정답이 정해지지 않은 물음을 읽고 내 경험으로 보완합니다.',
    );
    expect(metadata.alternates?.canonical).toBe(
      'https://www.zeroone.it.kr/insights/koans',
    );
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      title: metadata.title,
      description: metadata.description,
      url: metadata.alternates?.canonical,
      siteName: 'ZERO ONE IT',
    });
  });
});
