// @vitest-environment jsdom

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sanitizeAppintossArticleHtml } from './appintoss-html-sanitizer';

describe('App-in-Toss article HTML boundary', () => {
  let domWindow: typeof globalThis.window;
  let domDocument: typeof globalThis.document;

  beforeAll(() => {
    domWindow = globalThis.window;
    domDocument = globalThis.document;
  });

  beforeEach(() => {
    globalThis.window = domWindow;
    globalThis.document = domDocument;
  });

  it('AIT-HTML-01 허용 마크업은 유지하고 실행 가능한 태그는 제거한다', () => {
    expect(
      sanitizeAppintossArticleHtml(
        '<section class="zo-tip"><h2>제목</h2><p>본문</p></section>',
      ),
    ).toContain('<section class="zo-tip">');

    const sanitized = sanitizeAppintossArticleHtml(
      '<iframe srcdoc="unsafe"></iframe><script>unsafe</script><p>안전한 본문</p>',
    );

    expect(sanitized).toBe('<p>안전한 본문</p>');

    const sanitizedExternalContent = sanitizeAppintossArticleHtml(
      '<iframe src="https://evil.example/embed"></iframe><img src="https://evil.example/pixel.gif"><img src="https://api.zeroone.it.kr/public/image.png"><a href="https://evil.example">외부</a>',
    );

    expect(sanitizedExternalContent).not.toContain('iframe');
    expect(sanitizedExternalContent).not.toContain('evil.example/pixel.gif');
    expect(sanitizedExternalContent).toContain(
      '<img src="https://api.zeroone.it.kr/public/image.png">',
    );
    expect(sanitizedExternalContent).toContain('<a>외부</a>');
  });

  it.each([
    '<p style="background:url(https://evil.example/p.gif)">정상 본문</p>',
    '<p STYLE="BACKGROUND: URL( https://evil.example/p.gif )">정상 본문</p>',
    String.raw`<p style="background:u\72l(https://evil.example/p.gif)">정상 본문</p>`,
  ])('AIT-SEC-STYLE-01 인라인 스타일 변형을 제거하고 정상 텍스트를 보존한다: %s', (source) => {
    const sanitized = sanitizeAppintossArticleHtml(source);

    expect(sanitized).toBe('<p>정상 본문</p>');
    expect(sanitized).not.toContain('style=');
    expect(sanitized).not.toContain('evil.example');
  });
});
