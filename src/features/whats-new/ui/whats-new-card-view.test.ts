import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// 로그인 모달이 useRouter 를 쓰므로 서버 렌더 테스트용으로만 대체한다.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

import { WhatsNewCardView } from './whats-new-card-view';
import type { ReleaseNote } from '../model/release-notes';

const note: ReleaseNote = {
  version: '0.10.12',
  date: '2026-11-12',
  title: '업데이트 소식을 한곳에서 볼 수 있어요',
  body: ['첫 줄입니다.', '둘째 줄입니다.', '셋째 줄은 카드에 안 나옵니다.'],
  notify: true,
  try_href: '/updates',
};

const render = (value: ReleaseNote, isGuest = false) =>
  renderToStaticMarkup(
    createElement(WhatsNewCardView, {
      note: value,
      feedbackHref: '/my-inquiry/write?whats_new=0.10.12',
      isGuest,
      onTry: () => undefined,
      onFeedback: () => undefined,
      onClose: () => undefined,
    }),
  );

describe('새로운 기능 카드 화면', () => {
  it('WHATS-NEW-040 제목 1줄·설명(첫 줄)과 써 보기·의견 남기기·닫기를 보여 준다', () => {
    const html = render(note);
    expect(html).toContain('업데이트 소식을 한곳에서 볼 수 있어요');
    expect(html).toContain('첫 줄입니다.');
    expect(html).not.toContain('둘째 줄');
    expect(html).toContain('써 보기');
    expect(html).toContain('href="/updates"');
    expect(html).toContain('의견 남기기');
    expect(html).toContain('href="/my-inquiry/write?whats_new=0.10.12"');
    expect(html).toContain('aria-label="새로운 기능 안내 닫기"');
  });

  it('WHATS-NEW-041 try_href 가 없으면 써 보기 버튼을 그리지 않는다', () => {
    const html = render({ ...note, try_href: undefined });
    expect(html).not.toContain('써 보기');
    expect(html).toContain('의견 남기기');
  });

  it('WHATS-NEW-042 전면 차단 오버레이가 아니라 구석의 작은 카드다', () => {
    const html = render(note);
    expect(html).toContain('data-testid="whats-new-card"');
    expect(html).not.toContain('inset-0');
    expect(html).not.toContain('role="dialog"');
  });

  it('WHATS-NEW-043 비회원은 링크가 아니라 로그인 모달을 여는 버튼을 본다(문의 화면은 회원 전용)', () => {
    const html = render(note, true);
    expect(html).toContain('data-testid="whats-new-feedback"');
    expect(html).toContain('의견 남기기');
    expect(html).not.toContain('href="/my-inquiry/write');
    expect(html).toContain('<button');
  });
});
