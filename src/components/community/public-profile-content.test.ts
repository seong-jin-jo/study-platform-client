import { getByRole, queryByRole } from '@testing-library/dom';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string) => { window: Window & typeof globalThis };
};

vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));
vi.mock('next/image', () => ({
  default: ({ unoptimized: _unoptimized, ...props }: Record<string, unknown>) =>
    createElement('img', props),
}));

import PublicProfileContent from './public-profile-content';

const profile = {
  publicProfileUuid: '550e8400-e29b-41d4-a716-446655440042',
  nickname: '수연',
  profileImageUrl: null,
  simpleIntroduction: '매일 작은 자동화를 만들어요.',
  buildGoal: '예약 업무를 자동화하고 싶어요.',
  weeksTogether: 6,
  weeksTogetherLabel: '6주째 함께하고 있어요',
  rooms: {
    items: [{ roomId: 7, name: '업무 자동화', visibility: 'PUBLIC' as const }],
    nextCursor: null,
  },
  posts: {
    items: [
      {
        postId: 42,
        title: '첫 자동화 기록',
        previewText: '반복 입력부터 줄였어요.',
        destination: '/community/42',
      },
    ],
    nextCursor: null,
  },
  canonicalPath: '/members/550e8400-e29b-41d4-a716-446655440042',
  indexEligibility: { indexable: true, reason: 'PUBLIC' },
  updatedAt: '2026-08-17T00:00:00+09:00',
};

const renderDocument = (props: {
  showEdit?: boolean;
  showOwnerNotice?: boolean;
  showReport?: boolean;
}) => {
  const markup = renderToStaticMarkup(
    createElement(PublicProfileContent, { profile, ...props }),
  );
  return new JSDOM(markup).window.document;
};

describe('승인 공개 프로필 내용', () => {
  it('내 공개 보기에는 고치기와 비공개 항목 안내를 함께 렌더한다', () => {
    const document = renderDocument({
      showEdit: true,
      showOwnerNotice: true,
    });

    expect(getByRole(document.body, 'link', { name: '고치기' })).toBeTruthy();
    expect(queryByRole(document.body, 'link', { name: '신고' })).toBeNull();
    expect(document.body.textContent).toContain(
      '휴대폰 번호와 이메일, 결제 내역과 평판은 여기 나오지 않아요.',
    );
  });

  it('남의 프로필에는 기존 문의 경로의 신고 행동과 방·최근 글을 렌더한다', () => {
    const document = renderDocument({ showReport: true });
    const reportLink = getByRole(document.body, 'link', { name: '신고' });

    expect(reportLink.getAttribute('href')).toBe(
      '/my-inquiry/write?profileUuid=550e8400-e29b-41d4-a716-446655440042',
    );
    expect(
      getByRole(document.body, 'link', { name: '업무 자동화' }),
    ).toBeTruthy();
    expect(
      getByRole(document.body, 'link', { name: /첫 자동화 기록/ }),
    ).toBeTruthy();
  });
});
