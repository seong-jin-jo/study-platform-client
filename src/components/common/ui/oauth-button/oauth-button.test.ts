import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import OAuthButton from '@/components/common/ui/oauth-button';

describe('OAuthButton', () => {
  it.each([
    ['kakao', '카카오 계정 로그인', '/kakao-icon.svg'],
    ['google', 'Google 계정 로그인', '/google-icon.svg'],
  ] as const)('keeps the %s provider label and symbol', (provider, label, icon) => {
    const markup = renderToStaticMarkup(
      createElement(OAuthButton, { provider }),
    );

    expect(markup).toContain(label);
    expect(markup).toContain(icon);
    expect(markup).toContain('h-600');
  });

  it('blocks interaction and exposes busy state while loading', () => {
    const markup = renderToStaticMarkup(
      createElement(OAuthButton, { loading: true, provider: 'kakao' }),
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('disabled=""');
  });
});
