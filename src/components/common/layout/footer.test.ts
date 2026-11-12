import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Footer } from './footer';

describe('푸터 개인정보처리방침 링크', () => {
  it('PRIVACY-030 같은 사이트의 /privacy 로 연결되고 새 탭·외부 링크가 아니다', () => {
    const html = renderToStaticMarkup(createElement(Footer));
    const anchor = html.match(/<a[^>]*href="\/privacy"[^>]*>/)?.[0] ?? '';
    expect(anchor).not.toBe('');
    expect(anchor).not.toContain('target=');
    expect(html).not.toContain('notion.site');
  });
});
