import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AccountDeletionPage, { metadata } from './page';

describe('바이브링고 계정 삭제 공개 페이지', () => {
  it('ACCOUNT-DELETE-001 앱과 웹 삭제 요청 경로를 로그인 없이 읽을 수 있는 정적 문구로 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionPage));

    expect(html).toContain('바이브링고 계정 삭제 안내');
    expect(html).toContain('오른쪽 위 ≡ 버튼 &gt; 계정 삭제');
    expect(html).toContain('code0to1@gmail.com');
    expect(html).toContain('mailto:code0to1@gmail.com');
    expect(html).toContain('개인정보처리방침 원문 보기');
    expect(html).toContain('href="/privacy"');
    expect(html).not.toContain('notion.site');
  });

  it('ACCOUNT-DELETE-002 삭제·법정 보관 범위와 처리 기한을 모두 고지한다', () => {
    const html = renderToStaticMarkup(createElement(AccountDeletionPage));

    expect(html).toContain('계정에 연결된 개인정보를');
    expect(html).toContain('계약 또는 청약철회 등에 관한 기록');
    expect(html).toContain('대금 결제 및 재화 등의 공급에 관한 기록');
    expect(html).toContain('소비자 불만 또는 분쟁 처리에 관한 기록');
    expect(html).toContain('서비스 접속·요청 처리 기록');
    expect(html).toContain('5년');
    expect(html).toContain('3년');
    expect(html).toContain('1년');
    expect(html).toContain('10일 이내에 처리 결과를');
  });

  it('ACCOUNT-DELETE-003 공개 접근은 유지하되 사이트맵 발견 대상에서는 제외한다', () => {
    expect(metadata.alternates).toEqual({
      canonical: 'https://www.zeroone.it.kr/account/delete',
    });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
