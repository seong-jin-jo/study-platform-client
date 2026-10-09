// @vitest-environment jsdom

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderAndSanitizeAppintossMarkdown } from './appintoss-markdown';

describe('App-in-Toss community Markdown pipeline', () => {
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

  it('AIT-N3-01 Markdown 인용을 렌더한 뒤 정화해 blockquote를 보존한다', () => {
    const html = renderAndSanitizeAppintossMarkdown('> 먼저 확인할 내용');

    expect(html).toContain('<blockquote>');
    expect(html).toContain('먼저 확인할 내용');
    expect(html).not.toContain('&gt; 먼저 확인할 내용');
  });

  it('AIT-N3-02 자동 링크의 표시 텍스트는 보존하고 외부 이동만 제거한다', () => {
    const url = 'https://youtube.com/watch?v=abcdefghijk';
    const html = renderAndSanitizeAppintossMarkdown(`<${url}>`);

    expect(html).toContain(url);
    expect(html).toContain('<a>');
    expect(html).not.toContain('href=');
  });

  it.each([
    '<p style="background:url(https://evil.example/p.gif)">Markdown 본문</p>',
    '<p STYLE="BACKGROUND: URL( https://evil.example/p.gif )">Markdown 본문</p>',
    String.raw`<p style="background:u\72l(https://evil.example/p.gif)">Markdown 본문</p>`,
  ])('AIT-SEC-STYLE-02 Markdown 최종 HTML에서 인라인 스타일을 제거한다: %s', (source) => {
    const html = renderAndSanitizeAppintossMarkdown(source);

    expect(html).toContain('Markdown 본문');
    expect(html).not.toContain('style=');
    expect(html).not.toContain('evil.example');
  });
});
