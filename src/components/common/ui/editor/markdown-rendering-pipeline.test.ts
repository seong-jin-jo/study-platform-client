import { describe, expect, it } from 'vitest';
import { renderMarkdownContentHtml } from './markdown-rendering-pipeline';

describe('renderMarkdownContentHtml', () => {
  it('keeps markdown parsing when shortcode emoticons become image tags', () => {
    const html = renderMarkdownContentHtml(
      [
        '여러분이 이 코스를 만난 것은 우연이 아니에요.',
        '',
        ':joyful_xxl:',
        '',
        '### L01-01. 지금 옆에서 일어나고 있는 일들 사례',
        '',
        '**[Pieter Levels — 글로벌 인디 해커]**',
      ].join('\n'),
    );

    expect(html).toContain('<img');
    expect(html).toContain('/emoticon/joyful.png');
    expect(html).toContain('<h3>');
    expect(html).toContain('L01-01. 지금 옆에서 일어나고 있는 일들 사례');
    expect(html).toContain('<strong>');
    expect(html).not.toContain('### L01-01');
    expect(html).not.toContain('**[Pieter Levels');
  });

  it('keeps markdown parsing after a standalone emoticon line without blank lines (single-newline editor content)', () => {
    const html = renderMarkdownContentHtml(
      [
        '- 2014년 비트코인 보유자',
        '바이브코딩, AI 빌더 시대는 *이제 막 1-2년차*.',
        ':expect_xxl:',
        '**여러분이 지금 시작하면 그 1년차 멤버**예요.',
        '### L01-06 달성할 수 있는 것',
        '- **시간의 자유** — 반복 작업이 줄어듦',
      ].join('\n'),
    );

    expect(html).toContain('/emoticon/expect.png');
    // 이모티콘 아래 마크다운이 raw가 아니라 정상 HTML로 변환되어야 한다.
    expect(html).toContain('<h3>');
    expect(html).toContain(
      '<strong>여러분이 지금 시작하면 그 1년차 멤버</strong>',
    );
    expect(html).not.toContain('### L01-06');
    expect(html).not.toContain('**여러분이 지금 시작하면');
    expect(html).not.toContain('**시간의 자유**');
  });

  it('does not isolate inline emoticons that sit at the end of a paragraph line', () => {
    const html = renderMarkdownContentHtml(
      ['리스펙을 보냅니다. :hustle_xxl:', '다음 문장입니다.'].join('\n'),
    );

    // 인라인 이모티콘은 같은 문단 안에 <br>로 머무른다(별도 블록으로 분리되지 않음).
    expect(html).toContain('/emoticon/hustle.png');
    expect(html).toContain('<br>');
    expect(html).toContain('다음 문장입니다.');
  });
});
