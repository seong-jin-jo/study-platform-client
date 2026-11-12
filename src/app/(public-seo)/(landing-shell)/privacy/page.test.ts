import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PrivacyPolicyPage, { metadata } from './page';

describe('개인정보처리방침 공개 페이지', () => {
  const html = renderToStaticMarkup(createElement(PrivacyPolicyPage));

  it('PRIVACY-020 개정 공지, 현행 방침 안내, 전문, 개정 이력이 이 순서로 보인다', () => {
    const order = [
      'data-testid="privacy-notice"',
      'data-testid="privacy-current"',
      'data-testid="privacy-body"',
      'data-testid="privacy-history"',
    ].map((marker) => html.indexOf(marker));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('PRIVACY-021 공지에 시행일을, 현행 안내에 v0.3 적용 기간과 Notion 링크를 적는다', () => {
    expect(html).toContain('시행일 2026-12-13');
    expect(html).toContain('2026-12-12 까지는 현행 방침(v0.3)이 적용됩니다');
    expect(html).toContain(
      'href="https://gaan.notion.site/389fbb391d798087a519cda1255fdfc1"',
    );
  });

  it('PRIVACY-022 개정 이력에 v0.3 과 v1.0(시행·공지일)을 적는다', () => {
    expect(html).toContain('시행 2026-06-25');
    expect(html).toContain('시행 2026-12-13 (공지 2026-11-13)');
  });

  it('PRIVACY-023 title·description·canonical 메타데이터를 가진다', () => {
    expect(metadata.title).toBe('개인정보처리방침 | ZERO ONE IT');
    expect(String(metadata.description)).toContain('2026-12-13');
    expect(metadata.alternates).toEqual({
      canonical: 'https://www.zeroone.it.kr/privacy',
    });
  });
});
