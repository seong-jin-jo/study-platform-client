import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('llms.txt route', () => {
  it('serves plain text, not the SPA shell', async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8',
    );
  });

  it('starts with the brand heading generative search reads first', async () => {
    const body = await GET().text();

    expect(body.split('\n')[0]).toBe('# ZERO ONE IT');
  });

  it('exposes the canonical paths an answer engine should cite', async () => {
    const body = await GET().text();

    expect(body).toContain('https://www.zeroone.it.kr/insights');
    expect(body).toContain('https://www.zeroone.it.kr/community');
    expect(body).toContain('https://www.zeroone.it.kr/faq');
  });

  it('keeps the promises we refuse to make out of the citation source', async () => {
    const body = await GET().text();

    expect(body).toContain('취업 보장, 수익 보장, 완주 보장을 하지 않는다.');
  });
});
