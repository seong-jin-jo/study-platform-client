// @vitest-environment jsdom
import { generateJSON, getSchema } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildLessonEditorExtensions } from '@/components/common/ui/editor/lesson-editor-extensions';
import { renderMarkdownContentHtml } from '@/components/common/ui/editor/markdown-rendering-pipeline';
import { serializeProseMirrorDocToMarkdown } from '@/components/common/ui/editor/markdown-serializer';
import { markdownToEditorHtml } from '@/components/common/ui/editor/markdown-to-editor-html';

const extensions = buildLessonEditorExtensions();
const schema = getSchema(extensions);

const roundTrip = (markdown: string): string => {
  const html = markdownToEditorHtml(markdown);
  const json = generateJSON(html, extensions);
  const doc = Node.fromJSON(schema, json);
  return serializeProseMirrorDocToMarkdown(doc);
};

const normalize = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

describe('lesson markdown round-trip (mono 파이프텍스트)', () => {
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

  it('preserves canonical GFM through parse → serialize', () => {
    const fixtures: Record<string, string> = {
      heading: '# 제목\n\n본문 문단입니다.',
      emphasis: '**굵게** 그리고 *기울임* 그리고 ~~취소선~~ 입니다.',
      boldFollowedByParticle: '**중요**합니다.',
      boldPunctCJK: '<strong>연 매출 5억+</strong>를 올렸죠.',
      underline: '<u>밑줄</u> 텍스트입니다.',
      bulletList: '- 첫째\n- 둘째\n- 셋째',
      orderedList: '1. 하나\n2. 둘\n3. 셋',
      blockquote: '> 인용문입니다.',
      codeBlock: '```js\nconst a = 1;\n```',
      link: '[링크](https://example.com/)',
      emoticon: ':welcome_xxl:',
      table: '| 항목 | 설명 |\n| --- | --- |\n| 예시 | 내용 |',
      imageDefault: '![대체텍스트](images/lesson-content/a.png)',
    };

    const mismatches: string[] = [];
    for (const [name, md] of Object.entries(fixtures)) {
      const actual = normalize(roundTrip(md));
      const expected = normalize(md);
      if (actual !== expected) {
        mismatches.push(
          `\n[${name}]\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
        );
      }
    }
    expect(mismatches.join('')).toBe('');
  });

  it('preserves HTML-fallback invariants', () => {
    const imageWithWidth = roundTrip(
      '<img src="images/lesson-content/a.png" alt="설명" width="250" />',
    );
    expect(imageWithWidth).toContain('width="250"');
    const youtube = roundTrip('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(youtube).toContain('watch?v=dQw4w9WgXcQ');
  });

  it('renders bold in both markdown and HTML-fallback forms', () => {
    expect(renderMarkdownContentHtml('**중요**합니다.')).toContain(
      '<strong>중요</strong>',
    );
    const mixed =
      '## 제목\n\n<strong>5억+</strong>를 벌고 **바이브 코딩**이라는 영역.';
    const mixedHtml = renderMarkdownContentHtml(mixed);
    expect(mixedHtml).toContain('<strong>5억+</strong>');
    expect(mixedHtml).toContain('<strong>바이브 코딩</strong>');
    expect(mixedHtml).not.toContain('**바이브 코딩**');
  });
});
