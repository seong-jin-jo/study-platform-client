import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import UpdatesPage, { metadata } from './page';

describe('공개 업데이트 소식 페이지', () => {
  it('UPDATES-010 최신부터 3개를 `버전 · 날짜 · 제목` 머리줄로 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(UpdatesPage));
    expect(html.match(/data-testid="updates-item"/g)).toHaveLength(3);
    expect(html).toContain(
      '0.10.12 · 2026-11-12 · 업데이트 소식을 한곳에서 볼 수 있어요',
    );
    expect(html.indexOf('0.10.12 ·')).toBeLessThan(html.indexOf('0.10.11 ·'));
    expect(html.indexOf('0.10.11 ·')).toBeLessThan(html.indexOf('0.10.10 ·'));
    expect(html).not.toContain('0.10.9 ·');
  });

  it('UPDATES-011 title 과 description 메타데이터를 가진다', () => {
    expect(metadata.title).toBe('업데이트 소식 | ZERO ONE IT');
    expect(String(metadata.description).length).toBeGreaterThan(10);
  });
});
