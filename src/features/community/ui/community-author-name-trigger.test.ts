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
  default: ({ children, scroll: _scroll, ...props }: Record<string, unknown>) =>
    createElement('a', props, children as never),
}));
vi.mock('next/image', () => ({
  default: ({ unoptimized: _unoptimized, ...props }: Record<string, unknown>) =>
    createElement('img', props),
}));

import CommunityAuthorNameTrigger from './community-author-name-trigger';

const renderDocument = (publicProfileUuid?: string) => {
  const markup = renderToStaticMarkup(
    createElement(CommunityAuthorNameTrigger, {
      memberId: 42,
      publicProfileUuid,
      name: '수연',
    }),
  );

  return new JSDOM(markup).window.document;
};

describe('공개 프로필 진입 경계', () => {
  it('서버가 UUID를 준 작성자만 승인 canonical 경로를 연다', () => {
    const document = renderDocument('550e8400-e29b-41d4-a716-446655440042');
    const link = getByRole(document.body, 'link', {
      name: '수연 프로필 보기',
    });

    expect(link.getAttribute('href')).toBe(
      '/members/550e8400-e29b-41d4-a716-446655440042',
    );
  });

  it('UUID가 없으면 숫자 memberId로 추론하지 않고 비활성 안내를 남긴다', () => {
    const document = renderDocument();
    const disabledName = document.querySelector('[aria-disabled="true"]');

    expect(queryByRole(document.body, 'link')).toBeNull();
    expect(disabledName?.textContent).toContain('프로필을 열 수 없음');
    expect(disabledName?.getAttribute('title')).toBe(
      '프로필을 열 수 없는 사용자',
    );
  });
});
