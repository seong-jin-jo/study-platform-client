import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AppintossLink from './appintoss-link';

describe('App-in-Toss 링크', () => {
  it.each([
    ['/insights/koans/12/', '/insights/read/?kind=koan&amp;id=12'],
    ['/community/34/', '/community/read/?postId=34'],
    ['/class/detail/?slug=a', '/class/detail/?slug=a'],
  ])('AIT-PREFETCH-01 %s를 앱 정적 경로로 미리 변환한다', (href, expected) => {
    const markup = renderToStaticMarkup(
      createElement(AppintossLink, { href, prefetch: true }, '열기'),
    );

    expect(markup).toContain(`href="${expected}"`);
    expect(markup).not.toContain('prefetch');
  });

  it('AIT-PREFETCH-02 외부 링크는 프리페치 없이 앱 셸 차단 대상으로 남긴다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AppintossLink,
        { href: 'https://evil.example/path' },
        '외부',
      ),
    );

    expect(markup).toContain('href="https://evil.example/path"');
    expect(markup).not.toContain('prefetch');
  });
});
