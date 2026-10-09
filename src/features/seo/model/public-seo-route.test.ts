import { describe, expect, it } from 'vitest';
import {
  createPublicSeoRequestHeaders,
  extractRawPathname,
  isPublicSeoPath,
  PUBLIC_SEO_CREDENTIAL_HEADERS,
  PUBLIC_SEO_PATH_KINDS,
  resolvePublicSeoPath,
} from './public-seo-route';

describe('PUBLIC_SEO exact route matcher', () => {
  it.each([
    '/',
    '/home',
    '/insights',
    '/insights/koans',
    '/insights/land/deploy-ops',
    '/insights/zero-downtime-deploy',
    '/insights/koans/42',
    '/community',
    '/community/91',
    '/community/questions/501',
    '/community/rooms/17',
    '/members/11111111-1111-4111-8111-111111111111',
  ])('accepts %s', (pathname) => {
    expect(isPublicSeoPath(pathname)).toBe(true);
  });

  it.each([
    '/insights/weekly',
    '/insights/land',
    '/insights/koans/write',
    '/insights/x/progress',
    '/community/write',
    '/community/questions',
    '/community/questions/write',
    '/community/91/edit',
    '/community/rooms/17/edit',
    '/members/not-a-uuid',
    '/members/11111111-1111-4111-8111-111111111111/edit',
    '/payment',
    '/admin',
    '/api/v1/community/91',
    '/insights%2Fx%2Fprogress',
  ])('rejects %s', (pathname) => {
    expect(isPublicSeoPath(pathname)).toBe(false);
  });

  it.each([
    '/insights/%2e%2e%2fadmin',
    '/insights/%252e%252e%252fadmin',
    '/community/questions/%2e%2e%2f801',
    '/community/rooms/%5cadmin',
    '/members/not-a-uuid%0d%0aLocation:%20/admin',
  ])('rejects traversal and control bytes in %s before normalization', (pathname) => {
    expect(resolvePublicSeoPath(pathname)).toEqual({
      kind: PUBLIC_SEO_PATH_KINDS.INVALID,
      status: 400,
    });
  });

  it.each([
    '/insights/node%2ejs',
    '/insights/v1...v2',
    '/insights/land/domain%2emodel',
  ])('allows dots that remain inside a public slug in %s', (pathname) => {
    expect(resolvePublicSeoPath(pathname).kind).toBe(
      PUBLIC_SEO_PATH_KINDS.PUBLIC,
    );
  });

  it.each([
    '/members/not-a-uuid',
    '/community/questions/not-a-number',
    '/community/rooms/0',
    '/insights/koans/NaN',
  ])('returns a fail-closed 404 decision for invalid canonical identifiers in %s', (pathname) => {
    expect(resolvePublicSeoPath(pathname)).toEqual({
      kind: PUBLIC_SEO_PATH_KINDS.INVALID,
      status: 404,
    });
  });

  it('extracts the raw encoded pathname without query or fragment normalization', () => {
    expect(
      extractRawPathname(
        'https://zeroone.it.kr/insights/%2e%2e%2fadmin?next=%2Fhome#fragment',
      ),
    ).toBe('/insights/%2e%2e%2fadmin');
  });

  it('strips every credential and internal auth override header', () => {
    const headers = new Headers({ Accept: 'text/html' });
    PUBLIC_SEO_CREDENTIAL_HEADERS.forEach((name) => {
      headers.set(name, 'private-value');
    });

    const sanitized = createPublicSeoRequestHeaders(headers);

    expect(sanitized.get('accept')).toBe('text/html');
    PUBLIC_SEO_CREDENTIAL_HEADERS.forEach((name) => {
      expect(sanitized.has(name)).toBe(false);
    });
  });
});
