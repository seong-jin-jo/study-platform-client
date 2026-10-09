import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildLoginPathForCallback,
  buildLoginPathForInsightCallback,
  consumeOAuthCallbackPath,
  normalizeOAuthCallbackPath,
  normalizeInsightCallbackPath,
  storeOAuthCallbackPath,
} from './oauth-callback';

describe('OAuth callback path boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps an internal insight path including its query string', () => {
    expect(normalizeOAuthCallbackPath('/insights/event-loop?from=locked')).toBe(
      '/insights/event-loop?from=locked',
    );
  });

  it('builds the login CTA with the current article callback intact', () => {
    expect(buildLoginPathForCallback('/insights/event-loop')).toBe(
      '/login?callbackUrl=%2Finsights%2Fevent-loop',
    );
  });

  it('preserves the verified article path across OAuth and consumes it once', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    storeOAuthCallbackPath('/insights/event-loop');

    expect(consumeOAuthCallbackPath()).toBe('/insights/event-loop');
    expect(consumeOAuthCallbackPath()).toBe('/');
  });

  it.each([
    'https://attacker.example/steal',
    '//attacker.example/steal',
    '\\attacker.example/steal',
    '/\\attacker.example/steal',
    '/api',
    '/api/private/insights/secret/body',
    '/redirection',
    '/redirection?next=/insights/event-loop',
    '/login',
    '/login?callbackUrl=/insights/event-loop',
  ])('blocks an external or auth-internal callback: %s', (candidate) => {
    expect(normalizeOAuthCallbackPath(candidate)).toBe('/');
  });
});

describe('API-CALLBACK-001 인사이트 callback allowlist', () => {
  it('query와 fragment를 보존한 인사이트 원문만 허용한다', () => {
    expect(
      normalizeInsightCallbackPath('/insights/event-loop?from=land#resume'),
    ).toBe('/insights/event-loop?from=land#resume');
    expect(
      buildLoginPathForInsightCallback(
        '/insights/event-loop',
        '/insights/land/web',
      ),
    ).toBe('/login?callbackUrl=%2Finsights%2Fevent-loop');
  });

  it.each([
    'https://attacker.example/steal',
    '//attacker.example/steal',
    '\\attacker.example/steal',
    '/community/rooms/1',
    '/insights\\@attacker.example',
    '/insights/%252f%252fattacker.example',
    '/insights/%255c%255cattacker.example',
    '/insights/%253aevil',
    '/insights/ok\u0000bad',
  ])('외부·역슬래시·이중 인코딩 우회를 거부한다: %s', (candidate) => {
    expect(normalizeInsightCallbackPath(candidate, '/insights/land/web')).toBe(
      '/insights/land/web',
    );
  });
});
